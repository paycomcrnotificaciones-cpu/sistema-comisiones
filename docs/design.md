# Diseño — Sistema de Comisiones

> Borrador vivo. Se completa antes de escribir código.
> Marca con `[x]` lo decidido y enlaza la decisión en `docs/decisiones.md`.

## 1. Alcance

### MVP (primera versión usable)
- [ ] Ventas (registro manual e importación)
- [ ] Reglas de comisión
- [ ] Cálculo de comisiones
- [ ] Aprobación de comisiones
- [ ] Liquidaciones
- [ ] Reportes básicos

### Fuera del MVP (después)
- [ ] Control de tiempos
- [ ] Catálogos de producto/categoría
- [ ] Bonos y penalizaciones
- [ ] 2FA
- [ ] Exportaciones avanzadas

**Preguntas**
- ¿Quién usa el sistema el primer día y para qué tarea exacta?
- ¿Qué se puede dejar manual en el MVP?

## 2. Actores y permisos

Roles: SUPER_ADMIN, ADMIN, SUPERVISOR, COMISIONISTA.

Matriz rol × acción (completar):

| Acción | SUPER_ADMIN | ADMIN | SUPERVISOR | COMISIONISTA |
|---|---|---|---|---|
| Ver ventas | | | | |
| Crear ventas | | | | |
| Ver comisiones | | | | |
| Aprobar comisiones | | | | |
| Liquidar | | | | |
| Ver reportes | | | | |
| Administrar usuarios | | | | |
| Ver auditoría | | | | |

**Preguntas**
- ¿Un COMISIONISTA solo ve lo suyo? ¿Un SUPERVISOR ve su sucursal o toda la empresa?
- ¿Quién puede cambiar reglas?

## 3. Modelo de datos

Entidades propuestas (ajustar):

- **Empresa** 1—N **Sucursal** 1—N **Comisionista**
- **Usuario** N—1 **Empresa**; Usuario 1—1 Comisionista (opcional)
- **Moneda**, **TipoCambio** (par, tasa, fecha)
- **Puesto** (agrupación de comisionistas)
- **Regla** 1—N **ReglaRango**
- **Venta**, **Tiempo**
- **ComisionCalculada**
- **Liquidacion**, **AjusteComision**
- **Auditoria**

### Estados
- ComisionCalculada: `PENDIENTE → APROBADA → PAGADA` | `RECHAZADA`
- Liquidacion: `BORRADOR → APROBADA → PAGADA`
- AjusteComision: `PENDIENTE → aplicado a liquidación`

### Invariantes (escribir las tuyas)
- Toda fila de negocio pertenece a una empresa.
- Una comisión pagada no se recalcula.
- Un ajuste aplicado no se elimina.
- La suma de comisiones de una liquidación = `totalBase`; `total = totalBase + ajustes`.

**Preguntas**
- ¿Una venta puede generar varias comisiones (varias reglas acumulables)?
- ¿Se guarda el histórico de reglas o se versiona?

## 4. Reglas de negocio

Dimensiones de una regla:
- **Base de cálculo**: BRUTO / NETO / MARGEN
- **Tipo**: PORCENTAJE / FIJO / ESCALONADO
- **Ámbito**: GLOBAL / COMISIONISTA / PUESTO / PRODUCTO / CATEGORÍA
- **Prioridad**, **acumulable**, **vigencia desde/hasta**

**Preguntas**
- Precedencia: ¿la regla más específica gana, o se suman las acumulables?
- ¿Qué pasa si dos reglas del mismo ámbito y prioridad aplican?
- Redondeo: ¿por comisión o al total? ¿cuántos decimales?
- Moneda: ¿se calcula en moneda de la venta y se convierte, o al revés?

## 5. Multi-tenant y seguridad

- [ ] `empresa_id` en toda tabla de negocio
- [ ] RLS en base de datos con rol de aplicación separado
- [ ] Bypass explícito para SUPER_ADMIN
- [ ] Auditoría de toda escritura

**Preguntas**
- ¿Aislamiento por RLS, por filtro en código, o ambos?
- ¿El SUPER_ADMIN puede escribir en cualquier empresa?
- ¿Qué datos son sensibles y cómo se protegen?

## 6. Dinero y fechas

- Decimales: `Decimal(18,4)` (sugerido)
- Zona horaria de negocio: ____
- Definición de período de liquidación: ____
- Tasa de cambio: se guarda el valor usado en cada venta (sugerido)

## 7. Arquitectura

- Stack: ____ (sugerido: NestJS + Next.js + PostgreSQL + Prisma)
- Capas: controller → service → prisma
- Validación: esquemas compartidos (sugerido: Zod)
- Errores: formato único `{ statusCode, message }`
- Paginación: `pagina` / `limite`
- Auditoría: transversal en escritura

## 8. API

Ver `docs/api.md`. Regla: todo endpoint declara método, ruta, rol y contrato.

## 9. UI

Rutas por rol (completar):

| Ruta | Pantalla | Roles |
|---|---|---|
| /dashboard | Resumen | todos |
| /ventas | Ventas | |
| /comisiones | Comisiones | |
| /liquidaciones | Liquidaciones | |
| /reportes | Reportes | |
| /reglas | Reglas | |
| /usuarios | Usuarios | |
| /auditoria | Auditoría | |

## 10. Pruebas y definición de terminado

Un módulo está terminado cuando:
- [ ] Migración aplicada y reversible
- [ ] Validación de entrada
- [ ] Permisos por rol probados
- [ ] Aislamiento entre empresas probado
- [ ] Tests unitarios de la lógica crítica
- [ ] E2E del flujo principal
- [ ] Typecheck y lint limpios
- [ ] Documentado en `docs/api.md`
