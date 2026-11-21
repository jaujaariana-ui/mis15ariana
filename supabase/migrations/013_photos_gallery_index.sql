-- Índice compuesto para la consulta principal de la galería:
--   SELECT ... FROM photos WHERE event_id = ? AND deleted_at IS NULL ORDER BY created_at DESC
--
-- Los índices existentes de una sola columna (idx_photos_event, idx_photos_created)
-- no cubren el filtro por evento combinado con el ordenamiento por fecha. Al crecer
-- el número de fotos (varios invitados subiendo a la vez), esto evita un sort costoso.
-- El índice es parcial (WHERE deleted_at IS NULL) para no almacenar filas eliminadas.
CREATE INDEX IF NOT EXISTS idx_photos_event_created_active
  ON photos (event_id, created_at DESC)
  WHERE deleted_at IS NULL;
