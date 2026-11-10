# Sistema de Comisiones — Guía del proyecto

## 1. ¿Qué es?

Aplicación web para administrar **comisionistas, ventas y la comisión que genera
cada venta**. El administrador crea los perfiles de los comisionistas, registra
lo que vendieron y define la comisión de esa venta (porcentaje o monto fijo).
El sistema calcula y guarda el monto de comisión automáticamente.

El proyecto fue desarrollado desde cero por Dilan Delgado como una aplicación
full-stack: interfaz web, API REST y base de datos relacional.

## 2. Objetivo

Reemplazar el control manual (hojas de cálculo) por un sistema centralizado que:

- Mantenga un registro ordenado de comisionistas y ventas.
- Calcule la comisión de cada venta sin errores.
- Conserve el histórico: una venta pasada no cambia si cambian las reglas.
- Restrinja la información por empresa (cada empresa ve solo sus datos).

## 3. Flujo principal

1. El administrador inicia sesión.
2. Crea un **comisionista** (nombre, código y sucursal).
3. Registra una **venta**: fecha, qué vendió, monto de la venta y sucursal.
4. Indica la **comisión de esa venta**:
   - Porcentaje sobre el neto (por ejemplo, 5 %).
   - O un monto fijo en colones (por ejemplo, ₡1.500).
5. El sistema calcula la comisión y la muestra en el perfil del comisionista, con filtros por período y totales de vendido, comisión, pendiente y pagada.
6. Si una venta se anula, deja de contar para comisiones.
7. El administrador puede entrar al perfil de cada comisionista para editar sus
   datos, su acceso, agregar ventas y editar las ventas existentes.

## 4. Roles

| Rol | Descripción |
|---|---|
| SUPER_ADMIN | Acceso total; crea administradores y supervisores |
| ADMIN | Administra comisionistas, usuarios supervisores y ventas de su empresa |
| SUPERVISOR | Consulta comisionistas, ventas y comisiones; no modifica nada |
| COMISIONISTA | Consulta únicamente sus propias ventas y su comisión |

En esta versión todos los endpoints de negocio están protegidos con JWT y
filtran la información por la empresa del usuario.

### Acceso del comisionista

Cuando el administrador crea un comisionista con correo y contraseña, se crea
también su usuario con rol `COMISIONISTA`. Ese usuario puede iniciar sesión y ve
una versión reducida del sistema:

- Solo su **perfil**, con sus ventas, filtros por período y totales de comisión.
- No puede crear, editar ni anular ventas (responde `403`).
- No puede editar su perfil ni cambiar su contraseña: eso lo hace el admin.
- El menú lateral solo muestra **Mi perfil**; el resto queda oculto.

## 5. Tecnologías y herramientas

| Área | Tecnología | Versión |
|---|---|---|
| Lenguaje | TypeScript | 6 (backend) / 5 (frontend) |
| Backend | NestJS | 12 |
| Base de datos | PostgreSQL | contenedor Podman |
| ORM | Prisma | 7.10.1 |
| Frontend | Next.js | 16.4.2 |
| UI | React | 19.3.0 |
| Estilos | Tailwind CSS | 4 |
| Validación | Zod | 4 |
| Autenticación | JWT + bcryptjs | — |
| Entorno | Node.js 24, pnpm 12 | — |
| Editor | VS Code, Git | — |

## 6. Arquitectura

```
Navegador (Next.js / React)
        |
        | HTTP + JWT
        v
API REST (NestJS)
        |
        | Prisma
        v
PostgreSQL (Podman)
```

- El frontend consume la API en `http://localhost:4100/api`.
- La API valida los datos con Zod y aplica reglas de negocio.
- Prisma traduce el modelo a PostgreSQL.
- Cada consulta se filtra por `empresaId` para aislar los datos.

## 7. Modelo de datos

- **Empresa**: raíz de todos los datos.
- **Sucursal**: pertenece a una empresa.
- **Comisionista**: pertenece a una empresa y a una sucursal.
- **Usuario**: credenciales y rol; pertenece a una empresa.
- **Moneda**: catálogo por empresa.
- **Venta**: registra la operación y su comisión.

Campos de comisión en la venta:

- `comisionTipo`: `PORCENTAJE` o `MONTO_FIJO`.
- `comisionValor`: el porcentaje (0 a 100) o el monto fijo.
- `comisionMonto`: el resultado calculado, guardado con la venta.

## 8. Cálculo de la comisión

- Porcentaje: `comisionMonto = neto × comisionValor / 100`.
- Monto fijo: `comisionMonto = comisionValor`.

Ejemplo: venta con neto de ₡10.000 y comisión del 5 % genera ₡500.

Reglas:

- La comisión se calcula sobre el **neto**.
- El porcentaje no puede ser mayor a 100.
- El neto no puede ser mayor que el bruto.
- El dinero se guarda con 4 decimales y se muestra con 2.
- Las fechas se manejan en zona horaria de Costa Rica (UTC-6).

## 9. API principal

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión y devuelve un token JWT |
| GET | `/api/comisionistas` | Lista comisionistas de la empresa |
| POST | `/api/comisionistas` | Crea un comisionista |
| GET | `/api/sucursales` | Lista sucursales |
| GET | `/api/ventas` | Lista ventas con paginación y filtros |
| POST | `/api/ventas` | Registra una venta con su comisión |
| POST | `/api/ventas/:id/anular` | Anula una venta |
| GET | `/api/usuarios` | Lista usuarios y roles |
| POST | `/api/usuarios` | Crea un usuario con rol |
| PATCH | `/api/usuarios/:id` | Cambia rol, estado o contraseña |

El contrato detallado está en `docs/api.md`.

## 10. Pantallas

| Ruta | Pantalla | Función |
|---|---|---|
| `/login` | Inicio de sesión | Email y contraseña |
| `/resumen` | Resumen | Panel del mes: ventas, comisiones, top y sucursales |
| `/comisionistas` | Comisionistas | Listado, búsqueda y creación |
| `/comisionistas/[id]` | Perfil | Libreta del comisionista: datos, ventas, filtros por período y totales |
| `/ventas` | Redirección | Lleva a `/comisionistas`; el registro de ventas vive en el perfil |
| `/liquidaciones` | Liquidaciones | Genera borradores, paga y anula liquidaciones del mes |
| `/suscripciones` | Suscripciones | Ingreso recurrente y comisión por período |
| `/usuarios` | Usuarios | Crear usuarios y asignar roles (solo admin) |
| `/` | Inicio | Redirige a comisionistas |

Diseño: paleta propia, tipografías DM Sans y Manrope, modo claro/oscuro y
layout responsive con sidebar en escritorio.

## 11. Cómo ejecutar el proyecto

Base de datos:

```bash
podman start comisiones-db-v2
```

Backend (puerto 4100):

```bash
cd backend
pnpm install
pnpm run build
pnpm run start:prod
```

Frontend (puerto 3100):

```bash
cd frontend
pnpm install
pnpm dev -p 3100
```

Abrir `http://localhost:3100`.

Credenciales de demostración:

- Super admin: `super@demo.com`
- Admin: `admin@demo.com`
- Supervisor: `supervisor@demo.com`
- Comisionista: `laura@demo.com`
- Contraseña (todas): `Clave1234`

## 12. Estado actual

Completado:

- Autenticación con JWT y contraseñas cifradas.
- Gestión de comisionistas y sucursales.
- Registro, listado, filtros y anulación de ventas.
- Comisión por venta (porcentaje o monto fijo) calculada y guardada.
- Suscripciones con comisión recurrente (mensual, trimestral, semestral, anual o única).
- Perfil editable por comisionista: datos, acceso, ventas y comisiones.
- Interfaz completa con modo oscuro.

Pendiente / próximos pasos:

- Resumen mensual y reportes.
- Liquidaciones mensuales: borrador, pago y anulación.
- Edición de ventas y usuarios.
- Importación de ventas desde archivo.
- Exportación a CSV.
- Despliegue en un servidor.

## 13. Seguridad

- Contraseñas cifradas con bcryptjs (nunca se guardan en texto plano).
- Sesión mediante token JWT con expiración.
- Todos los endpoints de negocio validan el token.
- Los datos se filtran por empresa para evitar cruces entre clientes.
- Variables sensibles fuera del repositorio (`.env`).

## 14. Glosario

- **Comisionista**: persona que vende y recibe una comisión.
- **Venta**: operación registrada por el administrador.
- **Neto**: monto final de la venta sobre el que se calcula la comisión.
- **Comisión**: monto que se paga al comisionista por una venta.
- **Tenant**: empresa cuyos datos están aislados del resto.
