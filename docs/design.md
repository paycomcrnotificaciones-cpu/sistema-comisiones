# Diseño — PayCom CR

Documento de diseño del sistema implementado. Describe el alcance del MVP,
los actores, el modelo de datos y las reglas de negocio.

## 1. Alcance

### MVP implementado
- [x] Inicio de sesión con JWT.
- [x] Gestión de comisionistas y sucursales.
- [x] Registro y consulta de ventas.
- [x] Comisión por venta (porcentaje sobre el neto o monto fijo).
- [x] Anulación de ventas.
- [x] Interfaz con modo claro/oscuro y diseño responsive.

### Fuera del MVP (después)
- [ ] Liquidaciones y pagos.
- [ ] Aprobación de comisiones.
- [ ] Reportes y resumen mensual.
- [ ] Catálogos de producto/categoría.
- [ ] Importación de ventas.
- [ ] Bonos y penalizaciones.
- [ ] 2FA y exportaciones avanzadas.

## 2. Actores y permisos

Roles: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `COMISIONISTA`.

| Acción | SUPER_ADMIN | ADMIN | SUPERVISOR | COMISIONISTA |
|---|---|---|---|---|
| Iniciar sesión | ✓ | ✓ | ✓ | ✓ |
| Ver comisionistas | ✓ | ✓ | ✓ | ✓ |
| Crear comisionistas | ✓ | ✓ | | |
| Ver ventas | ✓ | ✓ | ✓ | ✓ |
| Crear ventas | ✓ | ✓ | | |
| Anular ventas | ✓ | ✓ | | |
| Ver comisiones | ✓ | ✓ | ✓ | ✓ |

Todo endpoint de negocio valida el JWT y filtra por el `empresaId` del token
(aislamiento por empresa / tenant).

## 3. Modelo de datos

- **Empresa** 1—N **Sucursal** 1—N **Comisionista**
- **Usuario** N—1 **Empresa**
- **Moneda** N—1 **Empresa**
- **Venta** N—1 **Empresa**, **Sucursal** y **Comisionista**

### Venta

Campos principales:

- `fecha`, `documento`, `cliente`, `producto`, `categoria`
- `bruto`, `neto`, `costo` (decimal, 4 decimales)
- `estado`: `ACTIVA` o `ANULADA`
- Comisión:
  - `comisionTipo`: `PORCENTAJE` o `MONTO_FIJO`
  - `comisionValor`: porcentaje (0–100) o monto fijo
  - `comisionMonto`: resultado calculado y guardado con la venta

Guardar `comisionMonto` con la venta deja un histórico: si mañana cambia una
regla de negocio, las ventas anteriores conservan su comisión.

### Estados

- `Venta`: `ACTIVA → ANULADA`.
- Una venta anulada no se toma en cuenta para el pago de comisiones.

### Invariantes

- Toda fila de negocio pertenece a una empresa.
- El `neto` no puede ser mayor que el `bruto`.
- El porcentaje de comisión debe estar entre 0 y 100.
- La comisión se calcula sobre el **neto**.
- Dinero: se guarda con 4 decimales y se muestra con 2.

## 4. Reglas de negocio

### Cálculo de la comisión

Al registrar una venta, el administrador elige el tipo de comisión y su valor:

- **Porcentaje**: `comisionMonto = neto * comisionValor / 100`.
- **Monto fijo**: `comisionMonto = comisionValor`.

La comisión puede ser `0` y es obligatoria en el formulario.

### Zona horaria

Las fechas se interpretan en UTC-6 (Costa Rica). El backend convierte las
fechas del formulario a `T06:00:00Z` para que el día coincida con la hora local.

### Fechas y dinero

- Fechas en formato `YYYY-MM-DD` en la API.
- Dinero como string decimal para evitar errores de punto flotante.

## 5. API

Ver `docs/api.md`. Todo endpoint declara método, ruta y contrato.

## 6. UI

| Ruta | Pantalla | Descripción |
|---|---|---|
| `/login` | Inicio de sesión | Acceso con email y contraseña |
| `/comisionistas` | Comisionistas | Listado, creación y búsqueda |
| `/ventas` | Redirección | Lleva a `/comisionistas`; las ventas se registran en el perfil |
| `/` | Redirección | Lleva a `/comisionistas` |

La interfaz usa DM Sans para texto, Manrope para títulos, modo claro/oscuro y
un layout responsive con sidebar en escritorio.

## 7. Pruebas y definición de terminado

Un módulo está terminado cuando:

- Compila (`pnpm build`) y pasa el análisis estático (`pnpm lint`).
- El contrato de API está documentado en `docs/api.md`.
- Se probó el flujo principal de punta a punta.
