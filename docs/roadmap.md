# Roadmap

Cada etapa termina con su definición de terminado (ver `docs/design.md` §10).

## 0. Diseño
- [ ] `docs/design.md` §1–5
- [ ] Cinco decisiones clave cerradas
- [ ] Revisión del diseño

## 1. Base del proyecto
- [ ] Repositorio y estructura
- [ ] Base de datos local
- [ ] Variables de entorno de ejemplo
- [ ] Typecheck, lint y test corriendo en vacío

## 2. Autenticación y tenant
- [ ] Login / logout
- [ ] Roles
- [ ] Contexto de empresa
- [ ] Aislamiento probado entre dos empresas

## 3. Catálogos base
- [ ] Empresa y sucursales
- [ ] Monedas y tipos de cambio
- [ ] Usuarios

## 4. Comisionistas
- [ ] CRUD
- [ ] Puestos
- [ ] Baja lógica

## 5. Reglas y motor de cálculo
- [ ] CRUD de reglas y rangos
- [ ] Motor con precedencia y acumulación
- [ ] Simulador

## 6. Ventas
- [ ] Registro manual
- [ ] Anulación
- [ ] Importación

## 7. Comisiones
- [ ] Recálculo
- [ ] Aprobar / rechazar
- [ ] Filtros

## 8. Liquidaciones
- [ ] Crear borrador
- [ ] Aprobar / pagar
- [ ] Ajustes (bonos/penalizaciones)

## 9. Reportes
- [ ] Resumen
- [ ] Por comisionista
- [ ] Exportación CSV

## 10. Auditoría
- [ ] Registro transversal
- [ ] Consulta y filtros

## 11. UI
- [ ] Navegación por rol
- [ ] Pantallas del MVP

## 12. Endurecimiento
- [ ] Cabeceras de seguridad
- [ ] Respaldos
- [ ] Despliegue documentado
