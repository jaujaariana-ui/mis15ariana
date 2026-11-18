# Xalt Moments

Plataforma web SaaS para compartir fotografías de eventos mediante código QR. Los invitados escanean un QR, acceden a una galería colaborativa, toman fotos con la cámara de sus teléfonos, las suben y las ven en tiempo real — sin necesidad de instalar ninguna aplicación.

## ✨ Características

- **Galería colaborativa en tiempo real** — Las fotos aparecen instantáneamente en todos los dispositivos conectados
- **Cámara integrada** — Captura fotos directamente desde el navegador del teléfono
- **Compresión inteligente** — Redimensiona a 1920px, convierte a WebP, elimina EXIF/GPS
- **Seguridad robusta** — RLS, protección IDOR, rate limiting, buckets privados con URLs firmadas
- **Panel administrativo** — Dashboard, gestión de eventos, fotos e invitados
- **QR descargable** — Genera códigos QR en PNG y PDF
- **Exportación ZIP** — Descarga todas las fotos de un evento
- **PWA** — Instalable en el teléfono, funciona offline con mensajes claros
- **Multi-tenant** — Preparado para SaaS con múltiples organizadores

## Stack Tecnológico

- **Frontend:** Next.js 16 con App Router, TypeScript, Tailwind CSS v4, shadcn/ui
- **Base de datos:** Supabase PostgreSQL con Row Level Security
- **Autenticación:** Supabase Auth (email/password para organizadores, anónima para invitados)
- **Almacenamiento:** Cloudflare R2 (buckets privados, URLs firmadas)
- **Tiempo real:** Supabase Realtime
- **Pruebas:** Playwright E2E
- **Despliegue:** Vercel

## Requisitos

- Node.js 20+
- npm 10+
- Cuenta de Supabase (plan gratuito o Pro)
- Cuenta de Cloudflare R2

## Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd "Xalt Moments"

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones de base de datos
# En el dashboard de Supabase > SQL Editor, ejecutar los archivos de supabase/migrations/ en orden

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Variables de Entorno

Copia `.env.example` a `.env.local` y completa los valores:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Solo servidor, no exponer

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

### Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Obtén las credenciales en **Project Settings > API**
3. Habilita la autenticación anónima en **Authentication > Settings > Auth providers > Allow anonymous sign-ins**
4. Ejecuta las migraciones SQL en orden en el **SQL Editor**

### Configurar Cloudflare R2

1. Crea un bucket en [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
2. Crea una API token con permisos de S3
3. Configura el bucket como **privado** (sin acceso público)
4. Obtén las credenciales en **R2 > API Tokens**

## Migraciones de Base de Datos

Ejecuta las migraciones SQL en orden en el SQL Editor de Supabase:

1. `supabase/migrations/001_create_organizers.sql` — Tabla de organizadores + trigger
2. `supabase/migrations/002_create_events.sql` — Tabla de eventos
3. `supabase/migrations/003_create_event_admins.sql` — Co-organizadores
4. `supabase/migrations/004_create_guest_profiles.sql` — Perfiles de invitados
5. `supabase/migrations/005_create_photos.sql` — Tabla de fotos
6. `supabase/migrations/006_create_rate_limits.sql` — Rate limiting
7. `supabase/migrations/007_enable_rls_policies.sql` — Políticas de seguridad RLS
8. `supabase/migrations/008_create_indexes.sql` — Índices de rendimiento

## Comandos

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Producción
npm start

# Linting
npm run lint

# Tests E2E
npx playwright install  # Instalar navegadores
npx playwright test

# Generar iconos PWA
node scripts/generate-icons.js
```

## Estructura del Proyecto

```
src/
  app/                    # Rutas y páginas (App Router)
    layout.tsx            # Layout raíz con metadata PWA
    page.tsx              # Landing page
    e/[eventSlug]/        # Página pública del evento (galería)
    admin/                # Panel administrativo
      login/              # Login de organizador
      register/           # Registro de organizador
      events/             # CRUD de eventos
      page.tsx            # Dashboard
    api/                  # API Route Handlers
      auth/               # Login, logout, sesión anónima
      events/             # CRUD de eventos, QR, fotos
      guest/              # Perfil de invitado
      photos/             # Subida, eliminación, descarga
  components/             # Componentes UI reutilizables
    ui/                   # shadcn/ui components
    gallery/              # Galería masonry, lightbox
    camera/               # Captura con cámara
    upload/               # Progreso y preview de subida
    events/               # Header y stats del evento
    admin/                # Dashboard, gestión de fotos/invitados
    shared/               # Consent modal, offline banner, skeletons
  features/               # Lógica de dominio por feature
  lib/                    # Configuración y utilidades
    supabase/             # Clientes browser, server, admin
    cloudflare/           # Cliente R2, URLs firmadas
    validations/          # Zod schemas
    security/             # Rate limiter, IDOR protection, file validator
  services/               # Servicios de negocio
  types/                  # Tipos TypeScript
  hooks/                  # Hooks personalizados
  utils/                  # Utilidades (compresión, EXIF, slugs)
  middleware.ts           # Rate limiting + security headers
supabase/
  migrations/             # Migraciones SQL versionadas
tests/
  e2e/                    # Tests E2E con Playwright
public/
  icons/                  # Iconos PWA
  manifest.json           # Manifest PWA
```

## Flujo de Uso

### Como Organizador

1. **Registro:** Accede a `/admin/register` y crea una cuenta
2. **Login:** Accede a `/admin/login` con tu email y contraseña
3. **Crear evento:** Desde el dashboard, crea un evento con nombre, descripción y fecha
4. **Compartir:** Genera y descarga el código QR o copia el enlace `/e/[slug]`
5. **Administrar:** Visualiza fotos, elimina contenido inapropiado, gestiona invitados

### Como Invitado

1. **Escanear QR:** Escanea el código QR con la cámara del teléfono
2. **Ingresar nombre:** Escribe tu nombre o apodo (sin crear cuenta)
3. **Consentir:** Acepta que tus fotos serán visibles para otros invitados
4. **Compartir fotos:** Toma fotos con la cámara o selecciona desde tu galería
5. **Ver galería:** Las fotos aparecen en tiempo real para todos
6. **Eliminar propias fotos:** Puedes eliminar solo las fotos que tú subiste

## Seguridad

### Protección de Datos

- **Row Level Security (RLS)** en todas las tablas de Supabase
- **Validación dual** en backend para cada operación sensible
- **Protección IDOR** — Los invitados solo eliminan sus propias fotos
- **Buckets privados** en R2 con URLs firmadas generadas en el servidor
- **Sin credenciales expuestas** — Las claves R2 nunca llegan al navegador

### Protección contra Abuso

- **Rate limiting** en middleware (10 uploads/min, 60 API calls/min)
- **Validación de archivos** — MIME type, magic bytes, tamaño máximo
- **Límites configurables** — Máximo de fotos por invitado, tamaño de archivo
- **Bloqueo de invitados** — Los admins pueden bloquear participantes abusivos
- **Verificación de estado** — Eventos cerrados o expirados no aceptan fotos

### Privacidad

- **Eliminación de EXIF/GPS** — Las fotos se limpian antes de subir
- **Consentimiento explícito** — Modal antes de participar
- **Sesión anónima** — Sin necesidad de email o contraseña para invitados
- **Fechas de expiración** — Los eventos pueden expirar automáticamente

## PWA (Progressive Web App)

La aplicación es instalable como PWA:

- **Manifest** configurado con iconos en múltiples tamaños
- **Instalación opcional** desde el navegador
- **Diseño mobile-first** adaptable a Android, iPhone, tablets y desktop
- **Manejo offline** con mensajes claros cuando no hay conexión

Para generar los iconos PWA:

```bash
node scripts/generate-icons.js
```

## Pruebas E2E

El proyecto incluye pruebas con Playwright cubriendo:

1. Creación de eventos
2. Generación de QR
3. Acceso de invitados
4. Subida de fotos
5. Galería en tiempo real
6. Eliminación de fotos propias
7. Protección contra eliminación de fotos ajenas
8. Permisos administrativos
9. Diseño responsive (mobile, tablet, desktop)

```bash
# Instalar navegadores
npx playwright install

# Ejecutar todas las pruebas
npx playwright test

# Ejecutar en modo UI
npx playwright test --ui

# Ejecutar un archivo específico
npx playwright test tests/e2e/event-creation.spec.ts
```

## Despliegue en Vercel

### Pasos

1. Conecta tu repositorio a [Vercel](https://vercel.com)
2. Configura las variables de entorno en el dashboard de Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
   - `NEXT_PUBLIC_APP_URL` (tu dominio de Vercel)
3. Vercel detectará automáticamente Next.js y construirá el proyecto

### Variables de entorno requeridas

| Variable | Descripción | Entorno |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Browser + Server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase | Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (NO exponer) | Server only |
| `R2_ACCOUNT_ID` | ID de cuenta Cloudflare R2 | Server only |
| `R2_ACCESS_KEY_ID` | Access key de R2 | Server only |
| `R2_SECRET_ACCESS_KEY` | Secret key de R2 | Server only |
| `R2_BUCKET_NAME` | Nombre del bucket | Server only |
| `R2_PUBLIC_URL` | URL pública del CDN | Server only |
| `NEXT_PUBLIC_APP_URL` | URL de la aplicación | Browser |

## Limitaciones del Plan Gratuito

- **Supabase:** Límite de 500MB de datos y 1GB de transferencia
- **Cloudflare R2:** 10GB de almacenamiento gratuito, 10M de lecturas/mes
- **Vercel:** 100GB de transferencia/mes en plan Hobby

Para producción a escala, considera migrar a planes pagos.

## Licencia

MIT
# mis15ariana
