-- ============================================
-- 012_create_draw_winners.sql
-- Historial de ganadores de sorteo - Xalt Moments
-- ============================================

-- Tabla para almacenar el historial de ganadores
CREATE TABLE IF NOT EXISTS draw_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL NOT NULL,
  display_name TEXT NOT NULL,
  session_id UUID REFERENCES draw_sessions(id) ON DELETE SET NULL,
  won_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas rápidas por evento
CREATE INDEX IF NOT EXISTS idx_draw_winners_event ON draw_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_draw_winners_participant ON draw_winners(participant_id);

-- Habilitar RLS
ALTER TABLE draw_winners ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Todos pueden leer el historial de ganadores
DO $$ BEGIN
  CREATE POLICY "Anyone can view draw winners"
    ON draw_winners FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo el organizador puede insertar ganadores
DO $$ BEGIN
  CREATE POLICY "Organizers can insert draw winners"
    ON draw_winners FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = draw_winners.event_id
        AND e.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Solo el organizador puede eliminar ganadores (para resetear)
DO $$ BEGIN
  CREATE POLICY "Organizers can delete draw winners"
    ON draw_winners FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = draw_winners.event_id
        AND e.organizer_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Habilitar Realtime para draw_winners
ALTER PUBLICATION supabase_realtime ADD TABLE draw_winners;
