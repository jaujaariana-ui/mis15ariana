-- ============================================
-- 009_create_draw_sessions.sql
-- Sorteo en tiempo real - Xalt Moments
-- ============================================

-- Tabla para sesiones de sorteo
CREATE TABLE IF NOT EXISTS draw_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'finished', 'cancelled')),
  winner_participant_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  winner_display_name TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID REFERENCES organizers(id) NOT NULL,
  animation_duration_ms INT DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas rápidas por evento
CREATE INDEX IF NOT EXISTS idx_draw_sessions_event ON draw_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_draw_sessions_status ON draw_sessions(status);

-- Habilitar RLS
ALTER TABLE draw_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos pueden leer sesiones de sorteo de eventos activos
DO $$ BEGIN
  CREATE POLICY "Anyone can view draw sessions"
    ON draw_sessions FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo el organizador puede crear sesiones de sorteo
DO $$ BEGIN
  CREATE POLICY "Organizers can create draw sessions"
    ON draw_sessions FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = draw_sessions.event_id
        AND e.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo el organizador puede actualizar sesiones de sorteo
DO $$ BEGIN
  CREATE POLICY "Organizers can update draw sessions"
    ON draw_sessions FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = draw_sessions.event_id
        AND e.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Habilitar Realtime para draw_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE draw_sessions;
