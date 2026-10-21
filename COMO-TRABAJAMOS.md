# Cómo trabajamos

## Roles

- **Dilan**: decide, escribe el código, ejecuta comandos, hace commits.
- **Asistente**: guía, revisa, señala riesgos y huecos; **no edita archivos** salvo que Dilan lo pida explícitamente (archivo + cambio).

## Flujo por tarea

1. **Entender**: qué se quiere y por qué.
2. **Decidir**: opciones con trade-offs; se registra en `docs/decisiones.md`.
3. **Dilan escribe**: código, migración, prueba.
4. **Revisión**: el asistente lee lo escrito y devuelve hallazgos concretos (archivo:línea).
5. **Verificar**: typecheck, lint, tests.
6. **Cerrar**: actualizar roadmap y decisiones.

## Reglas de la revisión

- Señalar problemas, no reescribir.
- Preguntas cerradas cuando haya ambigüedad.
- Priorizar: correctitud → seguridad/aislamiento → claridad → estilo.
- Si algo no está claro, se pregunta antes de asumir.

## Cómo pedir revisión

> Revisa `ruta/al/archivo` contra `docs/design.md` sección X.

## Cómo autorizar una edición

> Edita `ruta/al/archivo`: cambia A por B.

Sin esa instrucción, el asistente solo lee y comenta.
