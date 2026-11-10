# Roadmap

Cada etapa termina con su definición de terminado (ver `docs/design.md` §7).

## 0. Diseño — completado
- [x] `docs/design.md`
- [x] Decisiones clave cerradas
- [x] Revisión del diseño

## 1. Base del proyecto — completado
- [x] Repositorio y estructura
- [x] Base de datos local
- [x] Variables de entorno de ejemplo
- [x] Typecheck, lint y test corriendo

## 2. Autenticación y tenant — completado
- [x] Login con JWT
- [x] Roles
- [x] Contexto de empresa
- [x] Filtro por `empresaId` en todos los endpoints

## 3. Catálogos base — parcial
- [x] Empresa y sucursales
- [ ] Monedas y tipos de cambio
- [ ] Usuarios (CRUD)

## 4. Comisionistas — parcial
- [x] Listado y creación
- [x] Búsqueda
- [ ] Puestos
- [ ] Baja lógica desde la UI

## 5. Ventas — completado
- [x] Registro, edición y anulación desde el perfil del comisionista
- [x] Filtros por período y totales dentro del perfil
- [x] Estados pendiente / pagada por venta
- [ ] Importación

## 6. Comisiones — completado (MVP)
- [x] Comisión por venta (porcentaje sobre el neto o monto fijo)
- [x] Cálculo y guardado del monto de comisión
- [x] Visualización en el listado de ventas
- [ ] Aprobar / rechazar
- [ ] Recálculo masivo
- [x] Comisiones recurrentes por suscripción

## 7. Liquidaciones — completado (MVP)
- [x] Crear borrador
- [x] Aprobar / pagar
- [x] Anular borrador y liberar ventas
- [ ] Ajustes (bonos/penalizaciones)

## 8. Reportes — pendiente
- [ ] Resumen mensual
- [ ] Por comisionista
- [ ] Exportación CSV

## 9. Auditoría — pendiente
- [ ] Registro transversal
- [ ] Consulta y filtros

## 10. UI — parcial
- [x] Layout con sidebar, topbar y modo oscuro
- [x] Pantallas: login, comisionistas, ventas
- [ ] Pantallas por rol
- [ ] Resumen

## 11. Endurecimiento — pendiente
- [ ] Cabeceras de seguridad
- [ ] Respaldos
- [ ] Despliegue documentado
