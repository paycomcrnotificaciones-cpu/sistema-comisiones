# Sistema de Comisiones — Dilan Delgado

Proyecto construido **desde cero** por Dilan.

## Estado

- [x] Espacio de trabajo y git
- [x] Documentación de diseño (borrador)
- [x] Bootstrap: backend NestJS, frontend Next.js, PostgreSQL en podman
- [ ] Diseño cerrado (`docs/design.md`)
- [ ] Decisiones clave tomadas (`docs/decisiones.md`)
- [ ] Primer módulo

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

## Siguiente paso

Completar `docs/design.md` secciones 1–5 y las cinco decisiones clave en `docs/decisiones.md`.
