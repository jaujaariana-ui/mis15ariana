-- ============================================
-- Xalt Moments - Eliminar TODOS los datos
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/bqckjtrjtctwhjvfasxj/sql/new
--
-- ⚠️ ADVERTENCIA: Esta operación es IRREVERSIBLE.
--    Todos los datos se perderán permanentemente.
--
-- Generado: 2026-11-20
-- ============================================

BEGIN;

-- Desactivar temporalmente RLS para poder borrar todo
SET LOCAL row_security = off;

-- 1. Limpiar fotos (depende de guest_profiles y events)
TRUNCATE TABLE photos CASCADE;

-- 2. Limpiar rate_limits (depende de guest_profiles y events)
TRUNCATE TABLE rate_limits CASCADE;

-- 3. Limpiar guest_profiles (depende de events)
TRUNCATE TABLE guest_profiles CASCADE;

-- 4. Limpiar event_admins (depende de events y organizers)
TRUNCATE TABLE event_admins CASCADE;

-- 5. Limpiar events (depende de organizers)
TRUNCATE TABLE events CASCADE;

-- 6. Limpiar organizers (tabla base)
TRUNCATE TABLE organizers CASCADE;

COMMIT;

-- ============================================
-- Limpiar archivos en Supabase Storage
-- ============================================
-- TRUNCATE solo borra las filas de la base de datos.
-- Los archivos físicos en Storage NO se eliminan automáticamente.
--
-- Para borrar los archivos de Storage, ejecuta esto por separado:
--
-- Opción A: Desde el dashboard de Supabase:
--   1. Ve a Storage → buckets
--   2. Abre cada bucket (ej: "photos", "cover-images")
--   3. Selecciona todos los archivos y elimínalos
--
-- Opción B: Desde la API de Storage con Service Role Key:
--   (requiere acceso programático con SUPABASE_SERVICE_ROLE_KEY)
--
-- Opción C: Borrar buckets completos (si no los necesitas):
--   DROP OWNED BY current_user;
--   (esto es más drástico, borra los buckets enteros)
--
-- ============================================
-- Verificación
-- ============================================
-- Después de ejecutar, verifica que las tablas estén vacías:
--
-- SELECT 'photos' AS table_name, COUNT(*) FROM photos
-- UNION ALL SELECT 'guest_profiles', COUNT(*) FROM guest_profiles
-- UNION ALL SELECT 'rate_limits', COUNT(*) FROM rate_limits
-- UNION ALL SELECT 'event_admins', COUNT(*) FROM event_admins
-- UNION ALL SELECT 'events', COUNT(*) FROM events
-- UNION ALL SELECT 'organizers', COUNT(*) FROM organizers;
--
-- Todas las filas deben mostrar 0.
-- ============================================
