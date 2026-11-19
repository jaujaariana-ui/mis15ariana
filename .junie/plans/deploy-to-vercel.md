---
sessionId: session-261118-100020-1b9t
---

# Instrucciones para desplegar en Vercel

### ✅ Credenciales configuradas

He creado el archivo `.env.local` con todas tus credenciales de Supabase y Cloudinary. Ahora tu proyecto funciona localmente y está listo para Vercel.

---

### Paso 1: Crear el proyecto en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** → **"Project"**.
3. En la lista de repositorios, busca y selecciona **`mis15ariana`**.
4. Haz clic en **"Import"**.

---

### Paso 2: Configurar las variables de entorno en Vercel

En la pantalla de configuración del proyecto, busca la sección **"Environment Variables"** y agrega estas variables (aplica a **All Environments**):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Copia desde tu `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copia desde tu `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Copia desde tu `.env.local` |
| `CLOUDINARY_CLOUD_NAME` | Copia desde tu `.env.local` |
| `CLOUDINARY_API_KEY` | Copia desde tu `.env.local` |
| `CLOUDINARY_API_SECRET` | Copia desde tu `.env.local` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Copia desde tu `.env.local` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (cámbialo después del primer deploy) |

> **Importante:** No olvides ninguna variable. Si falta una, la aplicación no funcionará correctamente.

---

### Paso 3: Desplegar

1. Después de agregar las variables, haz clic en **"Deploy"**.
2. Vercel compilará y desplegará tu proyecto automáticamente (toma ~2-3 minutos).
3. Cuando termine, recibirás una URL como `https://mis15ariana.vercel.app`.

---

### Paso 4: Actualizar NEXT_PUBLIC_APP_URL

1. Una vez desplegado, copia la URL que Vercel te asignó (ej: `https://mis15ariana.vercel.app`).
2. Ve a **Project Settings** → **Environment Variables** en Vercel.
3. Edita `NEXT_PUBLIC_APP_URL` y pega la URL real.
4. Haz un nuevo deploy (Vercel lo hace automático si pushas cambios a GitHub, o puedes hacer "Redeploy" manual).

---

### Variables que Vercel configura automáticamente

- `NEXT_PUBLIC_VERCEL_URL` — Vercel la agrega solo (tu URL de producción).
- `NODE_ENV` — Se establece en `production` automáticamente.

**No las agregues manualmente** en el panel de Vercel.

---

### Después del deploy

- Tu página principal: `https://tu-proyecto.vercel.app`
- Panel de admin: `https://tu-proyecto.vercel.app/admin/login`
- Página del evento: `https://tu-proyecto.vercel.app/e/mis-15-ariana-mwmanlpz-lw70`
- Los códigos QR generados usarán la URL de Vercel automáticamente

# Delivery Steps

### ✓ Step 1: Crear .env.local con credenciales
El archivo `.env.local` se creó con todas las credenciales de Supabase y Cloudinary para que el proyecto funcione localmente.

### ✓ Step 2: Dar instrucciones para desplegar en Vercel
El usuario recibe los pasos exactos para importar el repositorio en Vercel, configurar las 8 variables de entorno necesarias, y desplegar el proyecto.
