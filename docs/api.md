# Contrato de API

API REST con prefijo `/api`. Autenticación por JWT en la cabecera
`Authorization: Bearer <token>`.

Formato de fila: método · ruta · request → response.

## Autenticación

| Método | Ruta | Request | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, usuario }` |

El token incluye `sub`, `email`, `empresaId` y `rol`. Todos los endpoints de
negocio filtran los datos por el `empresaId` del token.

## Comisionistas

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/comisionistas` | — | `Comisionista[]` |
| GET | `/comisionistas/:id` | — | `Comisionista` |
| POST | `/comisionistas` | `{ nombre, codigo?, sucursalId, email?, password? }` | `Comisionista` |
| PATCH | `/comisionistas/:id` | `{ nombre?, codigo?, sucursalId?, activo?, email?, password? }` | `Comisionista` |

`POST` y `PATCH` requieren rol `ADMIN` o `SUPER_ADMIN`.
El `SUPERVISOR` solo puede leer.
Un usuario con rol `COMISIONISTA` solo puede leer su propio perfil
(`GET /comisionistas` devuelve únicamente el suyo).

## Usuarios

Solo para `ADMIN` y `SUPER_ADMIN`.

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/usuarios` | — | `Usuario[]` |
| POST | `/usuarios` | `{ email, password, rol }` | `Usuario` |
| PATCH | `/usuarios/:id` | `{ email?, password?, rol?, activo? }` | `Usuario` |

El `SUPER_ADMIN` puede asignar `SUPERVISOR`, `ADMIN` y `SUPER_ADMIN`.
El `ADMIN` solo puede asignar `SUPERVISOR` y no puede editar a un `SUPER_ADMIN`.
Nunca se permite cambiar el rol propio ni dejar la empresa sin un
`SUPER_ADMIN` activo.

## Resumen (panel del mes)

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/resumen` | query: `mes` (`YYYY-MM`, opcional) | Totales del mes, metas, comparativo por sucursal |

Devuelve `totalVentas`, `montoVendido`, `totalComision`,
`comisionistasActivos`, `comisionPendiente`, `comisionPagada`,
`comisionVentas`, `comisionSuscripciones`, `ingresoRecurrente`,
`porComisionista`, `porSucursal` y `porDia`.
Si el usuario es `COMISIONISTA`, solo se calculan sus propios datos.
El mes se interpreta en hora de Costa Rica (UTC-6).

## Sucursales

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/sucursales` | — | `Sucursal[]` |

## Metas

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/metas` | query: `mes` | `{ mes, general, comisionistas: [{ comisionistaId, monto }] }` |
| PUT | `/metas` | `{ mes, monto, comisionistaId? }` (`monto: null` la elimina) | `Meta` |

Sin `comisionistaId` la meta es general de la empresa; con él aplica solo a
ese comisionista y tiene prioridad sobre la general.

## Historial

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/auditoria` | query: `pagina`, `limite`, `accion`, `q` | `{ total, pagina, limite, datos }` |

Registra automáticamente cada acción de escritura (crear, editar, anular,
pagar) con usuario, rol, entidad y resultado. Solo ADMIN y SUPER_ADMIN.

## Ventas

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/ventas` | query: `pagina`, `limite`, `desde`, `hasta`, `comisionistaId`, `sucursalId`, `estado`, `pago` (`PENDIENTE`/`PAGADA`), `q` (busca en producto) | `{ total, pagina, limite, datos, montoVendido, totalComision, comisionPendiente, comisionPagada }` |
| POST | `/ventas` | datos de la venta + comisión | `Venta` |
| PATCH | `/ventas/:id` | campos de la venta a modificar | `Venta` |
| POST | `/ventas/:id/anular` | — | `Venta` con estado `ANULADA` (409 si está liquidada) |
| GET | `/ventas/export` | mismos filtros que `/ventas` | CSV (`text/csv`) |

### Crear venta

```json
{
  "sucursalId": "uuid",
  "comisionistaId": "uuid",
  "fecha": "2026-10-29",
  "documento": "FAC-001",
  "cliente": "Cliente",
  "producto": "Producto",
  "categoria": "Categoría",
  "bruto": "12000",
  "neto": "10000",
  "costo": "2000",
  "comisionTipo": "PORCENTAJE",
  "comisionValor": "5"
}
```

- `comisionTipo`: `PORCENTAJE` o `MONTO_FIJO`.
- `comisionValor`: porcentaje (0–100) o monto fijo en colones.
- `comisionMonto`: calculado por el servidor y guardado con la venta.
  - `PORCENTAJE`: `neto * comisionValor / 100`.
  - `MONTO_FIJO`: `comisionValor`.

## Convenciones

- Errores: `{ statusCode, message }`.
- Paginación: `pagina` (1..n) y `limite`.
- Fechas en ISO 8601 (`YYYY-MM-DD`).
- Dinero como string decimal (se guarda con 4 decimales, se muestra con 2).
- Zona horaria: las fechas se interpretan en UTC-6 (Costa Rica).

## Liquidaciones

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/liquidaciones` | query: `mes`, `estado`, `comisionistaId` | `Liquidacion[]` |
| GET | `/liquidaciones/:id` | — | `Liquidacion` con `ventas` |
| POST | `/liquidaciones` | `{ comisionistaId, mes, nota? }` | `Liquidacion` en `BORRADOR` |
| POST | `/liquidaciones/:id/pagar` | `{ metodoPago?: EFECTIVO\|SINPE\|TRANSFERENCIA\|OTRO, nota? }` | `Liquidacion` en `PAGADA` con `metodoPago` y `pagadaEn` |
| POST | `/liquidaciones/:id/anular` | — | Libera las ventas y elimina el borrador |

Al generar un borrador se incluyen las ventas activas del mes que aún no
estén liquidadas. Una venta incluida no se puede editar ni anular (`409`).
No se puede anular una liquidación pagada.
El `COMISIONISTA` solo ve sus propias liquidaciones.

## Suscripciones

| Método | Ruta | Request | Response |
|---|---|---|---|
| GET | `/suscripciones` | query: `estado`, `comisionistaId` | `Suscripcion[]` |
| GET | `/suscripciones/:id` | — | `Suscripcion` |
| POST | `/suscripciones` | datos de la suscripción | `Suscripcion` |
| PATCH | `/suscripciones/:id` | campos a modificar | `Suscripcion` |
| POST | `/suscripciones/:id/pausar` | — | `Suscripcion` en `PAUSADA` |
| POST | `/suscripciones/:id/finalizar` | — | `Suscripcion` en `FINALIZADA` |
| POST | `/suscripciones/:id/reactivar` | — | `Suscripcion` en `ACTIVA` |

```json
{
  "comisionistaId": "uuid",
  "cliente": "Restaurante La Esquina",
  "producto": "Factelec",
  "monto": "30000",
  "frecuenciaCobro": "MENSUAL",
  "comisionTipo": "PORCENTAJE",
  "comisionValor": "10",
  "comisionFrecuencia": "MENSUAL",
  "inicio": "2026-11-01",
  "fin": null
}
```

Frecuencias: `MENSUAL`, `TRIMESTRAL`, `SEMESTRAL`, `ANUAL`, `UNICA`.
La comisión de cada período se calcula como `monto × mesesComisión ÷
mesesCobro` y se genera una sola vez por período. Al generar una liquidación
se incluyen automáticamente las comisiones del mes.
Solo `ADMIN` y `SUPER_ADMIN` pueden crear, editar o cambiar el estado.
El `COMISIONISTA` solo ve sus propias suscripciones.
