# Guía para entender y explicar la aplicación

Este documento explica el sistema en lenguaje sencillo: qué hace, quién lo usa,
cómo fluye la información y cómo presentarlo a los dueños o jefaturas.

## 1. ¿Qué es?

**PayCom CR** (de Solusoft CR) es un sistema web para registrar las ventas de una
empresa y calcular automáticamente cuánto gana cada comisionista por esas
ventas. Todo se guarda en internet (base de datos), no en hojas de cálculo
sueltas.

En una frase: *el administrador registra una venta, el sistema calcula la
comisión y el comisionista puede entrar a ver cuánto lleva ganado.*

## 2. ¿Qué problema resuelve?

Antes: las ventas y las comisiones se llevaban en Excel o en papel. Era fácil
equivocarse, no se sabía cuánto llevaba cada persona en el mes y no había una
forma clara de consultar el histórico.

Ahora:

- Cada venta queda registrada con fecha, comisionista, producto y monto.
- La comisión se calcula sola y queda guardada con la venta.
- Cada comisionista entra y ve solo lo suyo.
- El administrador ve todo y puede sacar un resumen del mes o un archivo Excel.

## 3. ¿Quién entra y qué puede hacer?

| Rol | Para quién | Qué puede hacer |
|---|---|---|
| SUPER_ADMIN | Dueño o responsable del sistema | Todo. Crea administradores, supervisores y usuarios |
| ADMIN | Administración de la empresa | Crea comisionistas, registra y anula ventas, crea supervisores y cambia contraseñas |
| SUPERVISOR | Encargado o jefe de área | Solo consulta: ve ventas, comisionistas y resumen, sin modificar |
| COMISIONISTA | Vendedor | Entra y ve únicamente sus ventas y su comisión acumulada |

Regla de oro: **nadie puede ver datos de otra empresa**. Cada usuario pertenece
a una empresa y todas las consultas se filtran por ella.

## 4. El flujo completo, paso a paso

1. El administrador entra con su correo y contraseña.
2. En **Comisionistas** crea a la persona y le asigna un correo y una
   contraseña. Con esos datos esa persona ya puede entrar.
3. Abre el **perfil del comisionista** y registra ahí lo que vendió:
   - fecha,
   - qué se vendió,
   - monto de la venta,
   - cómo se le paga la comisión (porcentaje o monto fijo).
4. El sistema calcula la comisión en ese momento y la guarda con la venta.
5. El perfil permite elegir el período (**este mes**, **mes anterior**,
   **todas** o un rango) y muestra el total vendido, la comisión generada,
   lo pendiente y lo pagado.
6. El comisionista entra con su correo y contraseña y ve **Mi perfil**, con
   sus ventas y su comisión, sin poder modificarlas.
7. El administrador puede anular una venta si hubo un error; la comisión deja
   de contar.
8. En **Resumen** se ve el total del mes.
9. Si el cliente paga mes a mes (por ejemplo la app Factelec para un
   restaurante), se registra una **suscripción** y la comisión se repite sola.
10. Al cerrar el mes, en **Liquidaciones** se genera un borrador con las ventas
   y las comisiones de suscripciones pendientes, se revisa y se marca como
   **pagada**.

## 5. ¿Cómo se calcula la comisión?

La comisión se define al registrar la venta. Hay dos formas:

**Porcentaje del monto vendido**

> Venta de ₡20.000 con 5 % → comisión = ₡20.000 × 5 ÷ 100 = **₡1.000**

**Monto fijo**

> Venta de ₡10.000 con comisión fija de ₡300 → comisión = **₡300**

La comisión se guarda dentro de la venta (`comisionMonto`). Esto es importante:
si mañana cambia una regla o un porcentaje, las ventas viejas **no cambian**.
Así el histórico siempre coincide con lo que se pagó en su momento.

El dinero se guarda con 4 decimales para evitar errores de redondeo y se
muestra con 2 decimales (colones).

## 6. Las pantallas

| Pantalla | Para qué sirve |
|---|---|
| Login | Entrar con correo y contraseña |
| Resumen | Totales del mes, gráfico por día, ranking de comisionistas y sucursales |
| Comisionistas | Crear y consultar comisionistas, con su acceso |
| Usuarios | Crear usuarios y asignar roles (solo admin y super admin) |
| Perfil del comisionista | Libreta de la persona: datos, ventas, filtros y totales |

En el **perfil del comisionista** el administrador registra, edita y anula las
ventas, y decide si quiere ver el mes actual, el anterior, todas o un rango de
fechas. La antigua pantalla de Ventas ahora redirige a Comisionistas.

## 7. ¿Cómo está construida? (para curiosos)

- **Frontend:** Next.js (React). Es la parte visual que se abre en el navegador.
- **Backend:** NestJS. Es el cerebro: valida datos, aplica permisos y calcula
  comisiones.
- **Base de datos:** PostgreSQL. Guarda empresas, usuarios, comisionistas y
  ventas.
- **Prisma:** traduce las consultas entre el backend y la base de datos.
- **Seguridad:** contraseñas cifradas, sesión con token y permisos por rol.

No hace falta explicar estas palabras a los patrones; basta con decir que es
una aplicación web con base de datos y accesos por rol.

## 8. Guion de demostración (3 minutos)

1. **Entrar como administrador** (`admin@demo.com` / `Clave1234`).
   Mostrar el **Resumen**: monto vendido del mes, comisión generada y ranking.
2. **Crear un comisionista** en Comisionistas con un correo nuevo y contraseña.
3. Abrir su **perfil** y **registrar dos ventas**: una con 5 % y otra con
   monto fijo. Señalar el cálculo en vivo y las tarjetas del período.
4. Cambiar el filtro a **Todas las ventas** y luego a **Rango personalizado**.
5. **Liquidaciones**: generar el borrador del mes para Laura, mostrar las
   ventas incluidas y marcarlo como **pagado**.
6. **Cerrar sesión** y entrar con el comisionista recién creado.
   Mostrar que solo ve **Mi perfil**, sus ventas y el estado pagado/pendiente.
7. **Volver al admin**, anular una venta (si no está liquidada) y mostrar cómo
   baja el total.

Mensaje para cerrar: *“El sistema registra la venta, calcula la comisión, la
guarda y le muestra a cada comisionista solo lo suyo. Con el resumen y la
libreta por comisionista, la administración revisa el mes sin hacer cuentas a
mano.”*

## 9. Preguntas que pueden hacer

**¿Se puede cambiar la comisión de una venta ya registrada?**
Sí, el administrador puede editar la venta (el backend ya lo permite).

**¿Qué pasa si se anula una venta?**
Queda marcada como anulada, no se borra, y deja de sumar en los totales.

**¿El comisionista puede cambiar su contraseña?**
No. Solo el administrador la cambia, por seguridad y control.

**¿Se puede usar en el celular?**
La interfaz se adapta a pantallas pequeñas, aunque está pensada para escritorio.

**¿Los datos están seguros?**
Las contraseñas se guardan cifradas y cada usuario solo accede a la información
de su empresa y, si es comisionista, solo a la suya.

## 10. Glosario

- **Venta:** operación comercial registrada.
- **Monto vendido:** lo que pagó el cliente.
- **Comisión:** lo que gana el comisionista por esa venta.
- **Comisión acumulada:** suma de las comisiones activas del período.
- **Anular:** marcar una venta como inválida sin borrarla.
- **Rol:** nivel de permisos de un usuario.
- **CSV:** archivo de texto con filas y columnas que abre Excel.

## 11. Liquidaciones: cómo se paga la comisión

La liquidación es el cierre del mes. Funciona así:

1. El administrador elige el mes y genera un **borrador** para un comisionista
   (o para todos con un solo botón).
2. El sistema toma todas las ventas activas de ese mes que todavía no estaban
   liquidadas, las marca y suma su comisión.
3. El administrador revisa el detalle y, cuando paga, marca la liquidación como
   **PAGADA** (queda la fecha de pago).
4. Si se equivocó, puede **anular el borrador**: las ventas se liberan y vuelven
   a quedar pendientes. Una liquidación ya pagada no se puede anular.

Reglas importantes:

- Una venta que ya está en una liquidación **no se puede editar ni anular**.
  Primero hay que anular el borrador.
- No puede haber dos liquidaciones del mismo comisionista en el mismo mes.
- Las ventas que se registren después quedan pendientes para el siguiente
  cierre.

En el **Resumen** se ven dos montos separados: **comisión pendiente** y
**comisión pagada**. El comisionista ve lo mismo en su pantalla de Mis ventas.

## 12. Suscripciones y comisiones recurrentes

Hay ventas que no son un pago único: un restaurante puede pagar Factelec todos
los meses. Para eso está **Suscripciones**.

El administrador define dos cosas por separado:

- **Cómo paga el cliente:** monto y frecuencia (mensual, trimestral, semestral,
  anual o única).
- **Cómo gana el comisionista:** porcentaje o monto fijo, y cada cuánto lo gana
  (también mensual, trimestral, semestral, anual o única).

Ejemplos:

| Cliente paga | Comisionista gana | Resultado |
|---|---|---|
| ₡30.000/mes | 10 % mensual | ₡3.000 cada mes |
| ₡360.000/año | 10 % mensual | ₡3.000 cada mes |
| ₡360.000/año | 10 % anual | ₡36.000 una vez al año |
| ₡30.000 una vez | 10 % única | ₡3.000 una sola vez |

Además se puede poner fecha de inicio y fecha final opcional (si se deja vacía,
la suscripción es indefinida). El administrador puede **pausar**, **reactivar**
o **finalizar** la suscripción; al pausarla deja de generar comisiones nuevas.

Cada mes, al generar la liquidación, el sistema incluye automáticamente la
comisión de las suscripciones activas. El detalle de la liquidación muestra
por separado:

- **Ventas:** comisiones de ventas únicas.
- **Suscripciones:** comisiones recurrentes del período.

Cambiar el porcentaje de una suscripción afecta solo los meses futuros: lo ya
liquidado conserva su valor.
