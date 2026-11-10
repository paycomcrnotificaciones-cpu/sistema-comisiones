# Registro de decisiones

Formato: una fila por decisión. Cuando se cierra, se rellena "Elegida" y "Motivo".

## Decisiones clave

|#|Decisión|Opciones|Elegida|Motivo|Fecha|
|---|---|---|---|---|---|
|1|Zona horaria y definición de período|UTC / local / mixto|Local UTC-6 (Costa Rica)|Coincide con la operación del negocio|2026-10-29|
|2|Aislamiento multi-tenant|RLS / filtro en código / ambos|Filtro en código por `empresaId`|Simple y suficiente para el MVP|2026-10-29|
|3|Redondeo y moneda|por comisión / al total; moneda venta / base|Por comisión, guardar 4 decimales y mostrar 2|Evita diferencias por redondeo|2026-10-29|
|4|Modelo de comisión|reglas complejas / comisión por venta|Comisión directa por venta|El admin registra la comisión de cada venta sin configurar reglas|2026-10-29|
|5|Alcance del MVP|mínimo / amplio|Mínimo|Login, comisionistas, ventas y comisión|2026-10-29|

## Decisiones posteriores

|#|Decisión|Elegida|Motivo|Fecha|
|---|---|---|---|---|
|6|Base de cálculo de la comisión|Sobre el neto|Es el monto real de la venta|2026-10-29|
|7|Tipos de comisión|Porcentaje o monto fijo por venta|Cubre ambos casos sin reglas complejas|2026-10-29|
|8|Comisión histórica|Guardar `comisionMonto` en la venta|Las ventas pasadas no cambian si cambian las reglas|2026-10-29|

## Plantilla

```
### N. Título
- Contexto:
- Opciones:
- Decisión:
- Consecuencias:
- Fecha:
```
