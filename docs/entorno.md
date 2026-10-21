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
```

El archivo de configuración de Prisma es `prisma7.config.ts` (Prisma 7 lo genera con ese nombre) y lee `DATABASE_URL` desde `backend/.env`.

## Frontend

```bash
cd frontend
pnpm install
pnpm dev           # http://localhost:3000
pnpm build
pnpm lint
```

## Variables de entorno

`backend/.env` (no se sube a git) y `backend/.env.example` (plantilla).

| Variable | Uso |
|---|---|
| `DATABASE_URL` | conexión PostgreSQL |
| `PORT` | puerto del backend (4000) |

## Abrir en VS Code

```bash
code "/home/Delgado/Sistema de comisiones Dilan Delgado"
```
