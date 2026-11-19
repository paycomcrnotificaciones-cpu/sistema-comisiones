# Comix

Aplicación web para administrar comisionistas, ventas y la comisión que genera cada venta. El proyecto está desarrollado por Dilan Delgado y se organiza en un frontend, una API y una base de datos relacional.

## Resumen para presentación

- **Tipo de sistema:** aplicación web full-stack.
- **Frontend:** Next.js, React, TypeScript y Tailwind CSS.
- **Backend:** API REST construida con NestJS y TypeScript sobre Node.js.
- **Base de datos:** PostgreSQL.
- **Acceso a datos y migraciones:** Prisma ORM.
- **Autenticación:** JWT; contraseñas protegidas con bcryptjs.
- **Validación de datos:** Zod.
- **Desarrollo local:** VS Code, Git, pnpm y Podman.

## Arquitectura

```text
Navegador
   │
   ▼
Frontend web (Next.js + React) ── HTTP/JSON ──► API REST (NestJS)
                                                    │
                                                    ▼
                                        Prisma ORM + PostgreSQL
```

La interfaz web consume la API mediante solicitudes HTTP y JSON. El backend organiza las funciones en módulos y usa Prisma para consultar PostgreSQL y administrar el esquema mediante migraciones.

## Tecnologías y herramientas

### Interfaz web

| Tecnología | Uso |
|---|---|
| Next.js 16 | Framework de la aplicación web y sus rutas |
| React 19 | Construcción de componentes e interfaces |
| TypeScript 5 | Tipado estático del frontend |
| Tailwind CSS 4 | Estilos y diseño adaptable |
| Turbopack | Herramienta de desarrollo integrada con Next.js |

### API y lógica de negocio

| Tecnología | Uso |
|---|---|
| Node.js 24 | Entorno de ejecución del backend |
| NestJS 12 | Framework modular para construir la API |
| TypeScript 6 | Lenguaje del backend |
| Express | Adaptador HTTP utilizado por NestJS |
| JSON y REST | Formato de intercambio y estilo de endpoints |

### Persistencia y seguridad

| Tecnología | Uso |
|---|---|
| PostgreSQL | Base de datos relacional |
| Prisma 7 | ORM, cliente de base de datos y migraciones |
| `@prisma/adapter-pg` | Adaptador de Prisma para PostgreSQL |
| JWT (`@nestjs/jwt`) | Emisión y validación de tokens de acceso |
| bcryptjs | Hash de contraseñas |
| Zod | Validación de datos de entrada |

### Calidad y flujo de desarrollo

| Herramienta | Uso |
|---|---|
| pnpm 12 | Instalación y administración de paquetes |
| Git | Control de versiones |
| VS Code | Editor de código |
| PostgreSQL 18 | Base de datos local (datos en `db/pgdata`) |
| Vitest 4 | Pruebas unitarias y de extremo a extremo |
| Supertest | Pruebas HTTP de la API |
| Oxlint | Análisis estático del backend |
| ESLint | Análisis estático del frontend |
| Prettier | Formato de código del backend |

## Funcionalidades y áreas del sistema

- Inicio de sesión con token JWT.
- Gestión de comisionistas y sucursales.
- Registro y consulta de ventas.
- Comisión por venta: el administrador indica un porcentaje sobre el neto o un monto fijo.
- Perfil editable por comisionista: datos, acceso, ventas y comisiones.
- Anulación de ventas (la comisión de una venta anulada no se toma en cuenta).
- Roles definidos para distintos niveles de acceso: superadministrador, administrador, supervisor y comisionista.

El proyecto sigue en desarrollo. Para conocer las decisiones de diseño, el contrato de API y el estado de las tareas, consulta la documentación en [`docs/`](./docs/).

## Modelo de datos

El esquema de PostgreSQL incluye entidades para empresas, usuarios, sucursales, comisionistas, monedas y ventas. Cada venta guarda su comisión (tipo, valor y monto calculado). Prisma mantiene el modelo en `backend/prisma/schema.prisma` y las migraciones en `backend/prisma/migrations/`.

## Estructura del proyecto

```text
.
├── backend/                 # API NestJS, Prisma y pruebas
│   ├── prisma/               # Esquema, migraciones y seed
│   └── src/                  # Módulos de autenticación y negocio
├── frontend/                # Interfaz Next.js y React
│   └── src/
│       ├── app/              # Páginas de la aplicación
│       ├── components/       # Componentes reutilizables
│       └── lib/              # Cliente para consumir la API
├── docs/                    # Diseño, decisiones, entorno y API
├── COMO-TRABAJAMOS.md
└── README.md
```

## Ejecución local

### Requisitos

- Node.js 24
- pnpm 12
- Podman 5.8
- Git

### 1. Iniciar la base de datos

```bash
pg_ctl -D db/pgdata -l logs/db.log start
```

Configura las variables de entorno del backend en `backend/.env`; puedes tomar `backend/.env.example` como referencia.

### 2. Iniciar la API

En una terminal:

```bash
cd backend
pnpm install
pnpm start:dev
```

En el entorno local se utiliza el puerto `4100` mediante la variable `PORT`. Si no se define, NestJS usa el puerto `4000` como valor predeterminado.

### 3. Iniciar la interfaz web

En otra terminal:

```bash
cd frontend
pnpm install
pnpm dev -- -p 3100
```

Abre la aplicación en [http://localhost:3100](http://localhost:3100).

## Comandos útiles

Desde `backend/`:

```bash
pnpm build       # Compilar la API
pnpm test        # Ejecutar pruebas unitarias
pnpm test:e2e    # Ejecutar pruebas de extremo a extremo
pnpm lint        # Analizar el código
```

Desde `frontend/`:

```bash
pnpm build       # Compilar la aplicación web
pnpm lint        # Analizar el código
```

## Documentación adicional

- [`COMO-TRABAJAMOS.md`](./COMO-TRABAJAMOS.md): roles y flujo de trabajo.
- [`docs/PROYECTO.md`](./docs/PROYECTO.md): guía completa del proyecto.
- [`docs/entorno.md`](./docs/entorno.md): configuración del entorno local.
- [`docs/api.md`](./docs/api.md): contrato y convenciones de la API.
- [`docs/design.md`](./docs/design.md): diseño del sistema.
- [`docs/decisiones.md`](./docs/decisiones.md): decisiones técnicas.
- [`docs/roadmap.md`](./docs/roadmap.md): próximos pasos.
