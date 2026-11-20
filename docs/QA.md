# Revisión de calidad — LiquiCom

Fecha: 20 de noviembre de 2026
Alcance: API (NestJS), web (Next.js) y base de datos (PostgreSQL).

## 1. Cómo se revisó

1. Lectura del código de los 12 módulos del backend y de las 10 pantallas.
2. Revisión de permisos: matriz rol × controlador.
3. Pruebas manuales contra la API local y la base real.
4. Pruebas unitarias del cálculo de dinero (`pnpm test`).
5. Revisión visual con capturas en escritorio y 420 px.

## 2. Hallazgos y estado

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | `JWT_SECRET` con valor por defecto | Alta | Corregido |
| 2 | Desactivar un usuario no cortaba su sesión | Alta | Corregido |
| 3 | Sin límite de intentos en login | Alta | Corregido |
| 4 | Cálculo de dinero con coma flotante | Alta | Corregido |
| 5 | Inyección de fórmulas en el CSV | Media | Corregido |
| 6 | `WEB_ORIGIN` sin validar al arrancar | Media | Corregido |
| 7 | Sin cabeceras de seguridad | Media | Corregido |
| 8 | `apiFetch` sin tiempo límite ni reintento | Media | Corregido |
| 9 | Import sin usar en comisionistas | Baja | Corregido |
| 10 | Cobertura de pruebas casi nula | Baja | Parcial (dinero) |

## 3. Qué cambió

### 3.1 Seguridad de sesión

- La API no arranca en producción sin `JWT_SECRET` ni `WEB_ORIGIN`.
- Cada petición consulta el usuario en la base: si está inactivo, responde 401
  de inmediato. El rol también se toma de la base, no del token.
- Límite de intentos: 120 peticiones por minuto en general, 5 en `/auth/login`
  y 10 en `/auth/activar`, por IP.
- Helmet activo (`nosniff`, `X-Frame-Options`) y CORS con orígenes explícitos,
  sin `credentials`.
- `trust proxy` activo para que el límite vea la IP real detrás de Render.

### 3.2 Dinero exacto

Nuevo módulo `backend/src/common/dinero.ts` sobre `decimal.js`:

- `porcentaje(base, valor)`: comisión con redondeo a 4 decimales (medio arriba).
- `sumarATexto(lista)`: sumas sin arrastre.
- `comparar`, `aNumero`, `aTexto`.

Se aplicó en:

| Archivo | Qué se corrigió |
|---|---|
| `ventas.service.ts` | cálculo de comisión, totales y comparaciones |
| `liquidaciones.service.ts` | total a pagar de una liquidación |
| `suscripciones/comisiones-suscripcion.service.ts` | prorrateo y porcentaje |
| `resumen/resumen.service.ts` | totales del panel, ranking y por día |

Verificación: `1 234,5678` al 10 % da `123,4568`, y los totales del mes
siguen coincidiendo con los de antes del cambio.

### 3.3 Red y exportación

- `apiFetch` tiene 45 s de espera, un reintento en GET y mensajes de error
  claros cuando la API está despertando.
- El CSV escapa fórmulas (`=`, `+`, `-`, `@`).

### 3.4 Generación de liquidaciones en lote

Antes la web pedía un borrador por cada comisionista y recibía un 400 de los
que no tenían nada pendiente; ese rechazo quedaba en el historial como
"Error 400" en rojo.

Ahora:

- `GET /api/liquidaciones/pendientes?mes=AAAA-MM` devuelve `total`,
  `yaTienen` y solo los `pendientes` (con algo que liquidar y sin
  liquidación previa).
- La web hace `POST` únicamente por esos comisionistas.
- "Nada que liquidar" responde **409**, que el historial muestra como
  "Omitido" en ámbar, igual que el duplicado.

Consecuencia: una generación de 5 comisionistas donde solo 1 tiene ventas
produce **1** petición y **1** registro en el historial, no 5.

Los registros con 400 que ya existían se eliminaron de la base local.

## 4. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Login correcto e incorrecto | ok |
| Usuario desactivado con token válido | 401 inmediato |
| Reactivado | 200 |
| 8 intentos de login fallidos | 429 desde el sexto |
| Cabeceras de seguridad | `nosniff` y `SAMEORIGIN` presentes |
| Venta con neto 1 234,5678 al 10 % | comisión 123,4568 |
| Totales del resumen | 102 000 / 14 900 / 12 900 / 2 000 / 90 000 |
| `pnpm test` (dinero) | 10 casos en verde |
| Lint backend y frontend | sin avisos |

## 5. Batería automatizada

`pnpm test` ejecuta las pruebas de dinero (10 casos).
`pnpm test:e2e` ejecuta 27 casos contra la base `comisiones_test`:

| Grupo | Qué cubre |
|---|---|
| Autenticación | login correcto e incorrecto, token inválido, sesión revocada |
| Permisos por rol | usuarios, ventas, auditoría, perfiles |
| Aislamiento entre empresas | listados, acceso por id, creación cruzada |
| Ventas | comisión porcentaje y monto fijo, neto > bruto, comisión > 100 % |
| Liquidaciones | total exacto, duplicado, pagar dos veces, anular pagada |
| Invitaciones | crear, activar, reutilizar enlace, contraseña corta |
| Generación en lote | pendientes por mes, exclusión de ya liquidados, permiso y 409 sin nada pendiente |

La base de pruebas se crea una vez:

```bash
createdb -h 127.0.0.1 -p 55433 -U comisiones comisiones_test
DATABASE_URL="postgresql://comisiones:dilan_dev_2026@127.0.0.1:55433/comisiones_test?schema=public" \
  pnpm prisma migrate deploy
```

## 6. Responsividad

Se revisaron las 9 pantallas privadas en 320, 360, 390, 414, 768, 1024 y
1440 px, más las públicas (login, recuperar, activar) a 320 x 568.

| Qué se corrigió | Dónde |
|---|---|
| Falta de `viewport` con `viewport-fit=cover` y `themeColor` | `app/layout.tsx` |
| Columnas de acciones pegadas también en celular | 8 tablas |
| Sombras de la columna fija visibles en celular | 8 tablas |
| Modales que se salían de la pantalla con el teclado abierto | confirmar, sucursales, pago |
| Migaja "Panel /" que apretaba el título a 320 px | `app-shell.tsx` |
| Barra de desplazamiento visible bajo el menú móvil | `globals.css` |
| Espacio inferior sin `safe-area` en iPhone | `app-shell.tsx` |
| Filtro con ancho mínimo forzado | `liquidaciones` |

Resultado: **0 desbordes horizontales** en las 63 combinaciones
(9 pantallas × 7 anchos). Las tablas no se aplastan: por debajo de `xl` se
ocultan las columnas secundarias y la tabla cabe sin scroll; desde `xl`
aparecen todas y el contenedor se desplaza si hace falta.

## 7. Pendiente

1. Pruebas de interfaz automatizadas (las actuales son manuales con capturas).
2. Cubrir reglas de comisión, metas y suscripciones en la batería.
3. Cambiar los `Number()` que quedan en `reglas` y `metas`: son de
   presentación, no afectan saldos.
4. Desplegar: migración en Neon, `JWT_SECRET` y `WEB_ORIGIN` en Render.
