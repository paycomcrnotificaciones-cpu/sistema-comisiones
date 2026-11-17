# Guía: subir una app a Netlify

Guía completa para publicar una aplicación web en Netlify, incluyendo el caso
de una app con frontend, API y base de datos. Al final está el resumen aplicado
a este proyecto (Sistema de Comisiones).

---

## 1. Qué hace Netlify y qué no

Netlify hospeda **sitios web**:

- HTML, CSS y JavaScript estático.
- Aplicaciones con renderizado en servidor (Next.js, Astro, Nuxt) usando su adaptador.
- Funciones serverless sueltas.

Netlify **no** hospeda:

- Una API con estado (NestJS, Express, Django, Laravel).
- Bases de datos (PostgreSQL, MySQL, Redis).
- Procesos en segundo plano o tareas largas.

Por eso, en una app full stack cada parte va a un servicio distinto:

| Parte | Servicio | Ejemplo en este proyecto |
|---|---|---|
| Web | Netlify | `sistema-comisiones.netlify.app` |
| API | Render, Fly.io, Railway | `sistema-comisiones-osln.onrender.com` |
| Base de datos | Neon, Supabase, Railway | Neon (Postgres 18) |

Regla mental: **Netlify solo sirve páginas**. Si la app necesita guardar datos o
validar contraseñas, eso vive afuera.

---

## 2. Requisitos previos

1. Repositorio en GitHub (puede ser privado).
2. Cuenta en Netlify, creada con GitHub.
3. Si hay API: cuenta en Render (o similar).
4. Si hay base de datos: cuenta en Neon (o similar).
5. El proyecto debe compilar en tu laptop. Si falla en local, falla en Netlify.

Comprobación local antes de tocar la nube:

```bash
pnpm install
pnpm build
```

---

## 3. Preparar el repositorio

### 3.1 Archivo `netlify.toml`

Va en la raíz del repositorio. Deja la configuración versionada y evita llenar
formularios a mano.

Frontend dentro de una subcarpeta (monorepo):

```toml
[build]
  base = "frontend"
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Sitio estático sencillo:

```toml
[build]
  publish = "dist"
```

Reglas:

- `base` es la carpeta donde Netlify ejecuta el build.
- `publish` es la carpeta publicada, **relativa a `base`**.
- El `netlify.toml` tiene prioridad sobre los campos del panel.
- Si el repo no tiene `index.html` en la raíz, Netlify muestra un 404 con
  "navegador de archivos": es señal de que faltan `base` o `publish`.

### 3.2 Next.js con rutas dinámicas

Rutas como `/comisionistas/[id]` no se pueden exportar como HTML estático sin
conocer todos los ids al compilar. Para eso existe el adaptador:

```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Netlify lo instala solo durante el build; no debe ir en `package.json`.

### 3.3 Qué no debe subirse

`.gitignore` mínimo:

```
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
*.log
```

Aunque el repo sea privado, las credenciales en git quedan en el historial para
siempre. Antes del primer push: `git log --all -- backend/.env` debe salir vacío.

---

## 4. Variables de entorno

| Dónde | Variable | Para qué |
|---|---|---|
| Netlify | `NEXT_PUBLIC_API_URL` | URL pública de la API |
| Netlify | `NODE_VERSION` | versión de Node del build |
| Render | `DATABASE_URL` | conexión a la base |
| Render | `JWT_SECRET` | firma de sesiones |
| Render | `WEB_ORIGIN` | URL exacta de Netlify (CORS) |
| Render | `HOST` | `0.0.0.0` para aceptar tráfico externo |

Importante: las variables `NEXT_PUBLIC_*` se **graban durante el build**.
Cambiarlas exige volver a desplegar (Trigger deploy → Clear cache and deploy
site). Guardarlas no basta.

Nunca pongas secretos con prefijo `NEXT_PUBLIC_`: quedan visibles en el
navegador.

---

## 5. Desplegar el frontend en Netlify

1. Entra a `app.netlify.com` con tu cuenta de GitHub.
2. **Add new site → Import an existing project**.
3. Elige **GitHub** y autoriza la **Netlify GitHub App**. Dale acceso solo al
   repositorio que vas a publicar.
4. Selecciona el repositorio.
5. Netlify lee el `netlify.toml`. Comprueba que muestre:
   - Base directory: `frontend`
   - Build command: `pnpm build`
   - Publish directory: `.next`
6. **Project name**: ponle uno claro; será tu subdominio.
   (`sistema-comisiones` → `sistema-comisiones.netlify.app`).
7. Abre **Add environment variables** y agrega una por línea:
   - `NEXT_PUBLIC_API_URL` = `https://<api>/api`
   - `NODE_VERSION` = `22`
8. **Deploy site**.
9. Espera el build. Si termina en verde, Netlify da una URL tipo
   `https://nombre.netlify.app`.

### 5.1 Hacer público el sitio

Si al abrir la URL aparece una pantalla de **Login Redirect** o un 401, la
protección **Edge Access** está activa:

**Project configuration → Access control → Visitor access → Public**.

Mientras siga privado, ni tú ni la app pueden usarlo sin sesión de Netlify.

### 5.2 Dominio propio (opcional)

**Domain management → Add a domain**. Netlify entrega un certificado HTTPS
automático. Después hay que actualizar `WEB_ORIGIN` en la API y
`NEXT_PUBLIC_API_URL` en Netlify si cambia el origen.

---

## 6. Desplegar la API (fuera de Netlify)

### 6.1 Base de datos

En Neon:

1. **New Project**, región cercana a la API.
2. **Connect** → desactiva **Connection pooling** (las migraciones necesitan la
   conexión directa).
3. Copia la cadena:
   ```
   postgresql://usuario:clave@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

Aplicar el esquema y copiar datos desde tu laptop:

```bash
# 1. Crear tablas en la nube (desde la carpeta de la API)
DATABASE_URL="<neon>" pnpm exec prisma migrate deploy

# 2. Copiar datos (sin tocar la tabla de migraciones)
pg_dump "$LOCAL" --data-only --no-owner --no-acl \
  --exclude-table=_prisma_migrations > datos.sql
psql "<neon>" -v ON_ERROR_STOP=1 -1 -f datos.sql

# 3. Verificar
psql "<neon>" -c "select count(*) from usuarios;"
```

### 6.2 Servicio en Render

1. `dashboard.render.com` → cuenta con GitHub.
2. **New → Web Service** → conecta el repositorio.
3. Configuración:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**:
     ```
     corepack enable && pnpm install --frozen-lockfile && pnpm exec prisma generate && pnpm build
     ```
   - **Start Command**: `node dist/main.js`
   - **Instance Type**: Free
4. Variables: `DATABASE_URL`, `JWT_SECRET` (largo y aleatorio), `WEB_ORIGIN`,
   `HOST=0.0.0.0`, `NODE_VERSION=22`.
5. **Deploy**.

Cuando termine, Render muestra la URL pública. Verifica:

```bash
curl https://<api>/api/health
```

### 6.3 pnpm y los scripts de instalación

pnpm moderno bloquea los scripts de instalación de dependencias como Prisma o
esbuild, y el build falla con `ERR_PNPM_IGNORED_BUILDS`. Se arregla en la raíz
de la API con `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  '@prisma/client': true
  '@prisma/engines': true
  esbuild: true
  prisma: true
```

---

## 7. Unir frontend y API

1. En Netlify, actualiza `NEXT_PUBLIC_API_URL` con la URL real de Render
   terminando en `/api`.
2. **Deploys → Trigger deploy → Clear cache and deploy site**.
3. En Render, `WEB_ORIGIN` debe ser **exactamente** la URL del sitio, sin barra
   final. Si no, las peticiones fallan con "Failed to fetch" por CORS.

Si en el futuro usas dominios de preview de Netlify, la API necesita aceptar
varios orígenes; hoy este proyecto acepta uno solo.

---

## 8. Verificación final

```bash
# Sitio publicado
curl -o /dev/null -w "%{http_code}\n" https://<sitio>/login        # 200

# API y base de datos
curl https://<api>/api/health                                      # {"status":"ok","db":"ok"}

# CORS
curl -D - -o /dev/null -X OPTIONS https://<api>/api/auth/login \
  -H "Origin: https://<sitio>" -H "Access-Control-Request-Method: POST" \
  | grep -i access-control-allow-origin
```

Y en el navegador: iniciar sesión, abrir una pantalla con datos y crear un
registro de prueba.

---

## 9. Errores comunes

| Síntoma | Causa | Solución |
|---|---|---|
| 404 con navegador de archivos | publica la raíz sin `index.html` | revisar `base` y `publish` |
| 404 en rutas dinámicas | falta el adaptador de Next | `@netlify/plugin-nextjs` |
| 401 "Login Redirect" | Edge Access privado | Access control → Public |
| `ERR_PNPM_IGNORED_BUILDS` | pnpm bloquea scripts de Prisma | `allowBuilds` en `pnpm-workspace.yaml` |
| Falla `pnpm install` | `packageManager`/versión distinta | fijar `NODE_VERSION` y `PNPM_VERSION` |
| "Failed to fetch" al login | CORS o URL de API vieja | `WEB_ORIGIN` exacto + redeploy |
| Cambios de env no aparecen | `NEXT_PUBLIC_*` se graba en build | redeploy con caché limpia |
| Primera carga lenta (~50 s) | Render free se duerme | normal en plan gratis |
| Build local ok, nube falla | versión de Node distinta | fijar `NODE_VERSION=22` |

---

## 10. Checklist antes de compartir el link

- [ ] `netlify.toml` versionado
- [ ] `.env` fuera de git y sin secretos en el historial
- [ ] Variables cargadas en Netlify y Render
- [ ] Deploy en verde
- [ ] Sitio público (sin Edge Access)
- [ ] API responde `/api/health`
- [ ] CORS con el origen exacto
- [ ] Migraciones aplicadas y datos copiados
- [ ] Login y creación de datos probados
- [ ] Claves demo cambiadas
- [ ] `JWT_SECRET` y contraseña de la base rotados

---

## 11. Resumen de este proyecto

| Cosa | Valor |
|---|---|
| Repo | `github.com/Dilan-Delgado/sistema-comisiones` (privado) |
| Web | `https://sistema-comisiones.netlify.app` |
| API | `https://sistema-comisiones-osln.onrender.com` |
| Base | Neon, Postgres 18, base `neondb` |
| Frontend | Next.js 16, `frontend/`, build `pnpm build`, publish `.next` |
| API | NestJS, `backend/`, start `node dist/main.js` |

Comandos locales relacionados:

```bash
# Desarrollo (Postgres local, API :4100, web :3100)
./iniciar.sh
./detener.sh

# Respaldo local
./respaldo.sh

# Subir cambios (Netlify y Render redeployan solos)
git add -A && git commit -m "..." && git push origin master
```
