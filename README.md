# Sistema de Comisiones — Dilan Delgado

Proyecto construido **desde cero** por Dilan.

## Estado

- [x] Espacio de trabajo y git
- [x] Documentación de diseño (borrador)
- [x] Bootstrap: backend NestJS, frontend Next.js, PostgreSQL en podman
- [x] Primer avance: login con JWT + CRUD de comisionistas
- [ ] Diseño cerrado (`docs/design.md`)
- [ ] Decisiones clave tomadas (`docs/decisiones.md`)
- [ ] Diseño y siguientes módulos (ver docs/roadmap.md)

## Estructura

```
.
├── backend/            # NestJS + Prisma
│   ├── src/
│   ├── prisma/schema.prisma
│   ├── prisma7.config.ts
│   └── .env.example
├── frontend/           # Next.js + TypeScript + Tailwind
│   └── src/app/
├── docs/
│   ├── design.md
│   ├── decisiones.md
│   ├── roadmap.md
│   ├── api.md
│   └── entorno.md
├── README.md
└── COMO-TRABAJAMOS.md
```

## Cómo trabajamos

Ver `COMO-TRABAJAMOS.md`. Dilan escribe el código; el asistente guía, revisa y solo edita si se le pide.

## Cómo correr

```bash
podman start comisiones-db-v2
cd backend && pnpm start:dev        # :4100
cd frontend && pnpm dev -- -p 3100  # :3100
```

Demo: `admin@demo.com` / `Clave1234`

## Siguiente paso

Completar `docs/design.md` secciones 1–5 y las cinco decisiones clave en `docs/decisiones.md`.
