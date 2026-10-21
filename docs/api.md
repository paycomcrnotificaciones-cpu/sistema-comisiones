# Contrato de API

Una tabla por módulo. Se completa antes de implementar el endpoint.

Formato de fila: método · ruta · rol mínimo · request → response.

## Autenticación
| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| POST | /auth/login | público | email, password | accessToken |
| POST | /auth/refresh | público | cookie | accessToken |
| POST | /auth/logout | autenticado | — | — |

## Ventas
| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| GET | /ventas | COMISIONISTA | pagina, limite, filtros | Venta[] |
| POST | /ventas | SUPERVISOR | venta | Venta |
| PATCH | /ventas/:id | SUPERVISOR | campos | Venta |
| POST | /ventas/:id/anular | SUPERVISOR | — | Venta |

## Comisiones
| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| GET | /comisiones | COMISIONISTA | filtros | Comision[] |
| POST | /comisiones/recalcular | SUPERVISOR | desde, hasta | resumen |
| POST | /comisiones/aprobar | SUPERVISOR | ids | resultado |

## Liquidaciones
| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| GET | /liquidaciones | COMISIONISTA | filtros | Liquidacion[] |
| POST | /liquidaciones | ADMIN | comisionistaId, período | Liquidacion |
| POST | /liquidaciones/:id/aprobar | ADMIN | — | Liquidacion |
| POST | /liquidaciones/:id/pagar | ADMIN | — | Liquidacion |

## Convenciones
- Errores: `{ statusCode, message }`.
- Paginación: `pagina` (1..n), `limite`.
- Fechas en ISO 8601.
- Dinero como string decimal.
