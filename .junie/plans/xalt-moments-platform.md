---
sessionId: session-261117-120944-141h
---

# Requirements

### Overview & Goals
**Xalt Moments** es una plataforma web SaaS que permite a organizadores de eventos crear galerías colaborativas de fotografías accesibles mediante un código QR. Los invitados pueden tomar fotos, subirlas y verlas en tiempo real sin instalar ninguna aplicación.

**Objetivo principal:** Una plataforma funcional donde un organizador crea un evento, genera un QR y todos los invitados pueden escanearlo, acceder a una galería común, tomar fotos con la cámara de sus teléfonos, subirlas, visualizarlas en tiempo real y eliminar sus propias fotos.

**Objetivo a largo plazo:** Evolucionar hacia un producto SaaS donde múltiples organizadores puedan crear y administrar sus propios eventos de forma independiente.

### Scope

#### In Scope
- Plataforma web mobile-first con Next.js + TypeScript + Tailwind + shadcn/ui
- Base de datos Supabase PostgreSQL con Row Level Security
- Autenticación anónima para invitados, autenticación de cuenta para organizadores
- Almacenamiento de fotos en Cloudflare R2 (buckets privados, URLs firmadas)
- Actualización de galería en tiempo real con Supabase Realtime
- Cámara del dispositivo y selección de fotos desde galería
- Compresión y optimización de imágenes en el cliente (WebP, 1920px máx, sin EXIF/GPS)
- Galería colaborativa estilo Pinterest/Masonry con lightbox
- Eliminación segura de fotos propias (validación en backend)
- Panel administrativo con dashboard, gestión de eventos, fotos y participantes
- Generación y descarga de códigos QR (PNG y PDF)
- Exportación de fotos en ZIP
- PWA con manifest e instalación opcional
- Diseño multi-tenant preparado para SaaS
- Pruebas con Playwright
- Despliegue en Vercel

#### Out of Scope (Fase actual)
- Pagos o suscripciones (se预留 la estructura para el futuro)
- Aplicación nativa móvil
- Chat o mensajería entre invitados
- Edición de fotos
- Inteligencia artificial o reconocimiento facial

### User Stories

**Como organizador:**
1. Quiero crear una cuenta para gestionar mis eventos.
2. Quiero crear eventos con nombre, descripción, fecha y portada.
3. Quiero generar y descargar un código QR para cada evento.
4. Quiero ver un dashboard con estadísticas de mis eventos.
5. Quiero eliminar cualquier foto de cualquier evento que administro.
6. Quiero descargar todas las fotos de un evento en un ZIP.
7. Quiero activar o desactivar eventos.
8. Quiero configurar fechas de expiración para eventos.
9. Quiero bloquear participantes abusivos.

**Como invitado:**
1. Quiero escanear un QR y acceder a la galería sin instalar nada.
2. Quiero ingresar con un nombre o apodo sin crear cuenta.
3. Quiero tomar fotos con la cámara de mi teléfono.
4. Quiero seleccionar fotos desde mi galería.
5. Quiero ver las fotos que suben otros invitados en tiempo real.
6. Quiero eliminar las fotos que yo subí.
7. Quiero descargar fotos de la galería.
8. Quiero ver quién subió cada foto y cuándo.

### Non-Functional Requirements
- **Rendimiento:** Carga progresiva, lazy loading, compresión en cliente.
- **Seguridad:** RLS en Supabase, validación backend, rate limiting, protección IDOR, buckets privados en R2, URLs firmadas, sin credenciales expuestas.
- **Privacidad:** Consentimiento antes de publicar, eliminación por propietario, aviso de visibilidad.
- **Accesibilidad:** Diseño responsive (Android, iPhone, tablets, desktop).
- **Conectividad:** Mensajes claros sin conexión, PWA con manejo offline.
- **Escalabilidad:** Arquitectura multi-tenant desde el inicio.

# Technical Design

### Current Implementation
El directorio `Xalt Moments` está vacío. Es un proyecto greenfield que se construirá desde cero.

### Key Decisions

**1. Arquitectura Multi-Tenant desde el inicio**
Cada organizador será un usuario autenticado con su propia colección de eventos. Las tablas `EVENTS`, `EVENT_ADMINS` y las políticas RLS asegurarán que cada organizador solo acceda a sus propios eventos y datos.

**2. Autenticación Dual**
- **Organizadores:** Autenticación con email/password vía Supabase Auth para acceso al panel admin.
- **Invitados:** Sesión anónima vía Supabase Auth (`signInAnonymously`) que persiste en el dispositivo para asociar fotos a su propietario y permitir eliminar solo las propias.

**3. Almacenamiento en Cloudflare R2 con URLs Firmadas**
- Buckets privados sin acceso público directo.
- El servidor genera URLs firmadas para subida (PUT) y descarga (GET).
- Las credenciales R2 solo existen en variables de entorno del servidor.
- El cliente nunca expone rutas de almacenamiento arbitrarias.

**4. Compresión en el Cliente**
Antes de subir:
- Redimensionar a máximo 1920px en el lado mayor.
- Convertir a WebP (con fallback a JPEG).
- Calidad ~80%.
- Eliminar metadatos EXIF (incluyendo GPS).
- Validar MIME type y tamaño real.

**5. Realtime con Supabase**
Suscripción a cambios en la tabla `PHOTOS` filtrada por `event_id` para actualizar la galería automáticamente en todos los dispositivos conectados.

**6. Estructura por Features (Feature-Sliced Design simplificado)**
Código organizado por módulos y responsabilidades: `app/` (rutas), `components/` (UI), `features/` (lógica de dominio), `lib/` (configuración), `services/` (integraciones), `types/` (contratos).

### Database Schema

```sql
-- ORGANIZADORES (usuarios autenticados)
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- EVENTOS
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  event_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired')),
  max_photos_per_guest INT DEFAULT 20,
  max_file_size_mb INT DEFAULT 10,
  organizer_id UUID REFERENCES organizers(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);

-- ADMINISTRADORES DE EVENTO (co-organizadores)
CREATE TABLE event_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES organizers(id) NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- PERFILES DE INVITADO
CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guest_profiles_event ON guest_profiles(event_id);
CREATE INDEX idx_guest_profiles_auth ON guest_profiles(auth_user_id);

-- FOTOS
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL NOT NULL,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  width INT,
  height INT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_photos_event ON photos(event_id);
CREATE INDEX idx_photos_guest ON photos(guest_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_created ON photos(created_at DESC);

-- RATE LIMITING
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guest_profiles(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_rate_limits_key ON rate_limits(ip_hash, action, window_start);
```

### Row Level Security Policies

```sql
-- EVENTS: solo el organizador o admins pueden leer/modificar
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their events"
  ON events FOR SELECT
  USING (organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));

CREATE POLICY "Organizers can insert events"
  ON events FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their events"
  ON events FOR UPDATE
  USING (organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));

-- GUEST_PROFILES: los invitados pueden ver su propio perfil
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their profile"
  ON guest_profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Guests can create their profile"
  ON guest_profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- PHOTOS: invitados ven todas las fotos del evento, pero solo eliminan las propias
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view photos of an event"
  ON photos FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Guests can upload photos"
  ON photos FOR INSERT
  WITH CHECK (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Guests can delete their own photos"
  ON photos FOR DELETE
  USING (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins can delete any photo"
  ON photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM events e
    JOIN event_admins ea ON ea.event_id = e.id
    WHERE e.id = photos.event_id
    AND ea.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = photos.event_id
    AND e.organizer_id = auth.uid()
  ));
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Solo servidor

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=xalt-moments-photos
R2_PUBLIC_URL=https://cdn.yourdomain.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### API Endpoints

| Endpoint | Método | Descripción | Autenticación |
|----------|--------|-------------|---------------|
| `/api/events` | GET | Listar eventos del organizador | Organizador |
| `/api/events` | POST | Crear evento | Organizador |
| `/api/events/:id` | GET | Detalle del evento | Organizador |
| `/api/events/:id` | PATCH | Actualizar evento | Organizador |
| `/api/events/:id/qr` | GET | Generar QR del evento | Organizador |
| `/api/events/:id/photos` | GET | Listar fotos del evento | Organizador |
| `/api/events/:id/photos/download` | GET | Descargar ZIP de fotos | Organizador |
| `/api/events/:slug` | GET | Página pública del evento | Público |
| `/api/guest/profile` | GET/POST | Perfil del invitado | Anónimo |
| `/api/photos/upload-url` | POST | Obtener URL firmada para subida | Anónimo |
| `/api/photos/upload` | POST | Registrar foto después de subida | Anónimo |
| `/api/photos/:id` | DELETE | Eliminar foto propia | Anónimo/Organizador |
| `/api/photos/:id/download` | GET | URL firmada para descarga | Anónimo |

### Component Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Public      │  │  Guest       │  │  Admin     │ │
│  │  Pages       │  │  Pages       │  │  Panel     │ │
│  │  /e/[slug]   │  │  Camera/     │  │  /admin    │ │
│  │              │  │  Upload      │  │            │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Shared Components (shadcn/ui + custom)         │ │
│  │  Gallery, Camera, Upload, QR, Lightbox          │ │
│  └─────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────┘
                         │ API Route Handlers
┌────────────────────────▼────────────────────────────┐
│                  Backend (Next.js)                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Event       │  │  Photo       │  │  Upload    │ │
│  │  Service     │  │  Service     │  │  Service   │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Security: RLS, Rate Limiting, IDOR Protection  │ │
│  └─────────────────────────────────────────────────┘ │
└──────┬──────────────────────────────┬───────────────┘
       │                              │
┌──────▼──────┐              ┌────────▼────────┐
│  Supabase   │              │  Cloudflare R2  │
│  PostgreSQL │              │  Object Storage │
│  + Auth     │              │  (Private)      │
│  + Realtime │              │                 │
└─────────────┘              └─────────────────┘
```

### File Structure

```
src/
  app/
    layout.tsx
    page.tsx                          # Landing page
    e/
      [eventSlug]/
        page.tsx                      # Página pública del evento
    admin/
      layout.tsx
      page.tsx                        # Dashboard
      events/
        page.tsx                      # Lista de eventos
        create/
          page.tsx                    # Crear evento
        [eventId]/
          page.tsx                    # Detalle y gestión
      login/
        page.tsx                      # Login organizador
    api/
      auth/
        login/
          route.ts
        logout/
          route.ts
        anonymous/
          route.ts
      events/
        route.ts                      # CRUD eventos
        [id]/
          route.ts
          qr/route.ts
          photos/route.ts
          photos/download/route.ts
      guest/
        profile/
          route.ts
      photos/
        upload-url/
          route.ts                    # URL firmada R2
        upload/
          route.ts                    # Registrar foto
        [id]/
          route.ts                    # Eliminar foto
          download/route.ts           # URL firmada descarga
    manifest.ts                       # PWA manifest
    sitemap.ts

  components/
    ui/                               # shadcn/ui components
    gallery/
      gallery-grid.tsx                # Masonry grid
      gallery-item.tsx                # Item individual
      lightbox.tsx                    # Visor de fotos
      empty-state.tsx
    camera/
      camera-capture.tsx              # Captura con cámara
      camera-preview.tsx
    upload/
      upload-progress.tsx             # Barra de progreso
      upload-preview.tsx              # Vista previa
      file-selector.tsx               # Selector de archivos
    events/
      event-header.tsx                # Portada del evento
      event-stats.tsx                 # Contadores
      qr-generator.tsx                # Generador de QR
    admin/
      dashboard-stats.tsx
      event-list.tsx
      event-form.tsx
      photo-manager.tsx
      guest-manager.tsx
    shared/
      consent-modal.tsx               # Modal de consentimiento
      offline-banner.tsx
      loading-skeleton.tsx

  features/
    events/
      event-actions.ts                # Server Actions
      event-validations.ts
    guests/
      guest-actions.ts
    photos/
      photo-actions.ts                # Server Actions
      photo-compression.ts            # Compresión en cliente
      photo-validation.ts
    authentication/
      auth-actions.ts

  lib/
    supabase/
      client.ts                       # Cliente browser
      server.ts                       # Cliente server
      admin.ts                        # Cliente service role
    cloudflare/
      r2-client.ts                    # Cliente R2
      signed-urls.ts                  # Generador de URLs firmadas
    validations/
      event-schemas.ts                # Zod schemas
      photo-schemas.ts
    security/
      rate-limiter.ts                 # Rate limiting
      idor-protection.ts              # Validación IDOR
      file-validator.ts               # Validación de archivos

  services/
    event.service.ts                  # Lógica de eventos
    photo.service.ts                  # Lógica de fotos
    upload.service.ts                 # Lógica de subida
    guest.service.ts                  # Lógica de invitados
    qr.service.ts                     # Generación de QR

  types/
    event.types.ts
    photo.types.ts
    guest.types.ts
    auth.types.ts

  hooks/
    use-event-realtime.ts             # Supabase Realtime
    use-camera.ts                     # MediaDevices API
    use-upload.ts                     # Subida de fotos
    use-guest-session.ts              # Sesión anónima
    use-gallery.ts                    # Galería con paginación

  utils/
    slug-generator.ts
    image-compression.ts              # Compresión WebP
    exif-remover.ts                   # Eliminación EXIF
    date-formatter.ts

supabase/
  migrations/
    001_create_organizers.sql
    002_create_events.sql
    003_create_event_admins.sql
    004_create_guest_profiles.sql
    005_create_photos.sql
    006_create_rate_limits.sql
    007_enable_rls_policies.sql
    008_create_indexes.sql

tests/
  e2e/
    event-creation.spec.ts
    qr-generation.spec.ts
    guest-access.spec.ts
    photo-upload.spec.ts
    gallery-realtime.spec.ts
    photo-deletion.spec.ts
    admin-permissions.spec.ts
    responsive.spec.ts

public/
  icons/                              # PWA icons
  images/

.next/
node_modules/
.gitignore
.env.local
tsconfig.json
tailwind.config.ts
next.config.ts
package.json
playwright.config.ts
README.md
```

### Risks

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Límites de Supabase en plan gratuito | Alto | Diseñar para migración a plan Pro, optimizar consultas |
| Costos de almacenamiento R2 | Medio | Compresión agresiva, política de expiración configurable |
| Abuso de subida de fotos | Alto | Rate limiting, validación MIME, límites de tamaño y cantidad |
| Compatibilidad de cámara en navegadores | Medio | Fallback a input file con capture="environment" |
| Sesión anónima perdida | Medio | Persistencia en localStorage, re-creación con mismo display name |
| Carga de galería con miles de fotos | Alto | Paginación, thumbnails, lazy loading |
| Eliminación de fotos de otros invitados | Crítico | RLS + validación backend dual, nunca confiar solo en frontend |
| Exposición de credenciales R2 | Crítico | URLs firmadas solo en servidor, buckets 100% privados |

# Implementation Plan

### ✓ Step 1: Phase 1 - Project Setup and Infrastructure
Initialize Next.js, configure tech stack, database schema, and project structure.

### ✓ Step 2: Phase 2 - Event Management and Public Access
Event CRUD, organizer auth with registration, public event pages with improved UX, guest sessions, QR generation.

### ✓ Step 3: Phase 3 - Camera, Photo Selection, and Upload
Camera capture, file selection, compression, EXIF removal, R2 upload flow.

### ✓ Step 4: Phase 4 - Collaborative Gallery and Realtime Updates
Masonry gallery, Supabase Realtime, lightbox, photo deletion with IDOR protection.

### ✓ Step 5: Phase 5 - Admin Panel and Event Management
Dashboard, event management, photo/guest management, ZIP export.

### ✓ Step 6: Phase 6 - Security, Testing, PWA, and Deployment
Security hardening, E2E tests, PWA config, Vercel deployment prep, README.

### ✓ Step 7: Migrate from Cloudflare R2 to Cloudinary
Replace R2 storage with Cloudinary (25 GB free, no credit card needed).