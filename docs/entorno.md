# Entorno de desarrollo

## Requisitos ya instalados
- Node.js 24
- pnpm 12
- PostgreSQL 18 (`initdb`, `psql`, `pg_dump` en el sistema)
- Git
- VS Code

## Base de datos (PostgreSQL local)

Los datos viven en `db/pgdata` · puerto `55433` · escucha solo en `127.0.0.1`

```bash
# iniciar
pg_ctl -D db/pgdata -l logs/db.log start

# estado
pg_isready -h 127.0.0.1 -p 55433

# detener
pg_ctl -D db/pgdata stop -m fast

# consola SQL
psql "postgresql://comisiones:CLAVE@127.0.0.1:55433/comisiones"
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
