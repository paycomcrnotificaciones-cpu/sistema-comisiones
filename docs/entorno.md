# Entorno de desarrollo

## Requisitos ya instalados
- Node.js 24
- pnpm 12
- podman 5.8
- Git
- VS Code

## Base de datos (PostgreSQL en podman)

Contenedor: `comisiones-db-v2` · puerto host `55433` · volumen `comisiones-db-v2-data`

```bash
# iniciar
podman start comisiones-db-v2

# estado
podman ps --filter name=comisiones-db-v2

# detener
podman stop comisiones-db-v2

# consola SQL
podman exec -it comisiones-db-v2 psql -U comisiones -d comisiones
```

Credenciales locales: usuario `comisiones`, base `comisiones`, clave en `backend/.env`.

## Backend

```bash
cd backend
pnpm install
pnpm start:dev     # http://localhost:4000
pnpm build         # compilar
pnpm test          # pruebas unitarias
pnpm test:e2e      # pruebas e2e
pnpm lint
```

Prisma:

```bash
cd backend
pnpm exec prisma validate
pnpm exec prisma migrate dev
pnpm exec prisma generate
pnpm exec prisma db seed
```

El archivo de configuración de Prisma es `prisma7.config.ts` (Prisma 7 lo genera con ese nombre) y lee `DATABASE_URL` desde `backend/.env`.

## Demo

Usuarios: `super@demo.com` (super admin), `admin@demo.com` (admin), `supervisor@demo.com` (supervisor) y `laura@demo.com` (comisionista) · Contraseña: `Clave1234`

Endpoints: `GET /api/health`, `POST /api/auth/login`, `GET|POST /api/comisionistas`, `GET /api/sucursales`.

> Los puertos 4000 y 3000 los usa el proyecto anterior; este usa 4100 y 3100.

## Frontend

```bash
cd frontend
pnpm install
pnpm dev -- -p 3100 # http://localhost:3100
pnpm build
pnpm lint
```

## Variables de entorno

`backend/.env` (no se sube a git) y `backend/.env.example` (plantilla).

| Variable | Uso |
|---|---|
| `DATABASE_URL` | conexión PostgreSQL |
| `PORT` | puerto del backend (4100) |
| `JWT_SECRET` | firma de los tokens |
| `WEB_ORIGIN` | origen permitido por CORS |

## Abrir en VS Code

```bash
code "/home/Delgado/Sistema de comisiones Dilan Delgado"
```
