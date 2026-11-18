# Guía docente: desplegar aplicaciones web en Netlify

Material de clase para el docente · 5 sesiones · Nivel técnico de colegio

**Cómo usar este documento.** Cada sesión está pensada para 45–60 minutos y
sigue la misma estructura: objetivo, conceptos, práctica guiada, el "por qué",
errores típicos, ejercicio y cierre. Las notas marcadas como **Para el docente**
son indicaciones de conducción, no contenido para dictar.

---

## Ficha del curso

| Dato | Detalle |
|---|---|
| Tema | Despliegue de aplicaciones web en Netlify |
| Nivel | Técnico de colegio (con terminal y Git básico) |
| Duración | 5 sesiones de 45–60 minutos |
| Requisitos | Cuenta de GitHub, Node.js y pnpm instalados, editor de código |
| Producto final | Una aplicación desplegada y accesible por internet |
| Evaluación sugerida | Práctica guiada 40 %, actividad integradora 40 %, diagnóstico de errores 20 % |

## Objetivos generales

Al terminar las cinco sesiones, el estudiante podrá:

1. Explicar qué es un CDN y por qué un sitio estático no necesita servidor propio.
2. Conectar un repositorio de GitHub con Netlify y publicar un sitio.
3. Configurar un build con `netlify.toml` y variables de entorno.
4. Reconocer cuándo una aplicación necesita un servidor y cómo separar frontend, API y base de datos.
5. Diagnosticar los errores más frecuentes de despliegue (404, 401, CORS, fallos de build).
6. Identificar los límites de un plan gratuito y tomar decisiones con esa información.

---

# Sesión 1 — Qué es Netlify y primer despliegue

**Duración:** 50 minutos · **Objetivo:** publicar un sitio estático desde GitHub
y entender qué hace Netlify por debajo.

## 1.1 Idea clave

Un sitio web, visto desde el servidor, es solo un conjunto de archivos: HTML,
CSS, JavaScript e imágenes. Servirlos significa entregarlos cuando alguien los
pide. Netlify hace exactamente eso, pero desde una red de servidores repartidos
por el mundo (CDN), con HTTPS automático.

**Analogía para clase:** una biblioteca con sucursales en cada ciudad. El libro
(archivo) es el mismo, pero se entrega desde la sucursal más cercana al lector.

## 1.2 Qué hace y qué no hace Netlify

| Sí hace | No hace |
|---|---|
| Publicar HTML, CSS y JavaScript | Ejecutar una API con estado |
| Compilar proyectos (Next.js, Astro, Vite) | Guardar una base de datos |
| Dar HTTPS y dominio | Mantener procesos encendidos |
| Funciones serverless puntuales | Reemplazar un servidor de aplicaciones |

**Para el docente:** insista en esta tabla. La confusión más común del alumno es
creer que Netlify "hospeda la app completa".

## 1.3 Práctica guiada

1. Crear en GitHub un repositorio llamado `mi-primera-web`.
2. Subir un `index.html` sencillo:

```html
<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><title>Mi primera web</title></head>
  <body><h1>Hola desde Netlify</h1></body>
</html>
```

3. Entrar a `app.netlify.com` e iniciar sesión con GitHub.
4. **Add new site → Import an existing project → GitHub**.
5. Autorizar la aplicación de Netlify solo para ese repositorio.
6. Dejar el build vacío y publicar la raíz del proyecto.
7. Abrir la URL que asigna Netlify.

## 1.4 Por qué se hace así

Netlify no copia archivos a mano: se conecta al repositorio y **compila** en cada
push. Ese vínculo es lo que permite que un cambio en el código aparezca en línea
sin subir archivos por FTP.

## 1.5 Error típico

> "Me sale un 404 con un navegador de archivos."

Significa que Netlify publicó una carpeta sin `index.html` en la raíz. Solución:
indicar la carpeta correcta o el directorio de publicación.

## 1.6 Ejercicio

Modificar el `index.html`, hacer commit y push, y observar cómo Netlify publica
automáticamente. Anotar cuánto tarda el despliegue.

## 1.7 Preguntas de repaso

- ¿Qué diferencia hay entre el repositorio y el sitio publicado?
- ¿Qué pasa si se borra el repositorio y el sitio ya está publicado?
- ¿Por qué Netlify puede entregar el sitio más rápido que un servidor único?

**Cierre:** cada estudiante debe tener una URL pública funcionando.

---

# Sesión 2 — Build, configuración y variables

**Duración:** 55 minutos · **Objetivo:** entender el ciclo de build y configurar
un proyecto con `netlify.toml` y variables de entorno.

## 2.1 Idea clave

Compilar es transformar el código fuente en archivos listos para publicar.
Cuando el proyecto está dentro de una subcarpeta, o usa un framework, hay que
decirle a Netlify **dónde** compilar y **qué** publicar.

**Analogía:** la receta y el plato terminado. El repositorio es la receta; el
build es cocinar; el directorio de publicación es el plato servido.

## 2.2 Las dos rutas que hay que declarar

| Campo | Pregunta que responde | Ejemplo |
|---|---|---|
| `base` | ¿En qué carpeta está el proyecto? | `frontend` |
| `publish` | ¿Qué carpeta se publica? | `dist` o `.next` |

`publish` siempre es **relativo a `base`**. Es el error de configuración más
frecuente: escribir `frontend/dist` cuando `base` ya es `frontend`.

## 2.3 Archivo `netlify.toml`

```toml
[build]
  base = "frontend"
  command = "pnpm build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

Ventajas frente a llenar el panel web:

- Queda versionado junto al código.
- Todo el equipo ve la misma configuración.
- Tiene prioridad sobre los campos del panel.

## 2.4 Variables de entorno

Son valores que cambian según el entorno (desarrollo, producción) y no deben
estar escritos en el código: direcciones de API, claves, nombres de base.

```bash
# En el panel: Project configuration → Environment variables
NEXT_PUBLIC_API_URL = "https://mi-api.ejemplo.com/api"
NODE_VERSION = "22"
```

**Regla de oro:** lo que empieza con `NEXT_PUBLIC_` lo puede leer el navegador;
por eso nunca debe contener secretos.

## 2.5 El detalle que sorprende a todos

Las variables del frontend se **graban durante el build**. Si se cambian después,
hay que volver a desplegar. Guardar la variable no basta.

## 2.6 Práctica guiada

1. Crear un proyecto con Vite o Next.js en una carpeta `frontend`.
2. Agregar el `netlify.toml` anterior.
3. Definir la variable de entorno en el panel.
4. Desplegar y comprobar que el build la usa.
5. Cambiar la variable, observar que no cambia nada y luego redesplegar con
   **Clear cache and deploy site**.

## 2.7 Error típico

> "El build funciona en mi computadora pero falla en Netlify."

Casi siempre es la versión de Node o del gestor de paquetes. Solución: fijar
`NODE_VERSION` y `PNPM_VERSION` en la configuración.

## 2.8 Ejercicio

Desplegar el mismo proyecto dos veces: una con `base` correcto y otra con
`base` mal escrito. Documentar el mensaje de error de cada caso.

## 2.9 Preguntas de repaso

- ¿Por qué `publish` es relativo a `base`?
- ¿Qué diferencia hay entre una variable normal y una `NEXT_PUBLIC_`?
- ¿Cuándo hay que redesplegar obligatoriamente?

**Cierre:** cada estudiante debe explicar, en dos frases, qué hace su build.

---

# Sesión 3 — Next.js y rutas dinámicas

**Duración:** 55 minutos · **Objetivo:** comprender cuándo un proyecto necesita
el adaptador de Netlify y cómo funcionan las rutas dinámicas.

## 3.1 Idea clave

Un sitio estático se genera una vez y se sirve igual para todos. Una aplicación
con rutas como `/producto/123` necesita decidir en el momento qué mostrar.

**Analogía:** un menú impreso (estático) frente a un mesero que busca el plato
que pediste (dinámico).

## 3.2 Los tres modelos

| Modelo | Quién genera el HTML | Ejemplo |
|---|---|---|
| Estático | El build, una sola vez | Blog, portafolio |
| Renderizado en servidor | Un servidor en cada visita | Panel con datos |
| En el navegador | JavaScript del cliente | Tablero que consulta una API |

## 3.3 Por qué una ruta dinámica rompe el despliegue

Si se exporta un Next.js como HTML puro, `/producto/123` no existe como archivo:
el id no se conoce al compilar. La solución de Netlify es un **adaptador** que
convierte las rutas de Next en funciones que se ejecutan cuando llega la visita.

```toml
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Netlify lo instala solo durante el build: no se agrega a `package.json`.

## 3.4 Cuándo usar exportación estática

Si el sitio no tiene rutas dinámicas ni datos en el servidor, se puede exportar
como HTML puro. Es más rápido y consume menos recursos. Si hay rutas dinámicas,
se necesita el adaptador.

## 3.5 Práctica guiada

1. Crear una app Next.js con una ruta `app/productos/[id]/page.tsx`.
2. Desplegar sin adaptador: comprobar el 404 en la ruta dinámica.
3. Agregar `@netlify/plugin-nextjs` y volver a desplegar.
4. Entrar a `/productos/1` y verificar que la página carga.

## 3.6 Error típico

> "La página principal funciona, pero cualquier ruta interna da 404."

Es la firma clásica de un sitio estático sin adaptador o de una redirección mal
configurada.

## 3.7 Ejercicio

Comparar el tiempo de carga de una página estática y una renderizada en
servidor. Anotar conclusiones y explicar cuál conviene para un panel interno.

## 3.8 Preguntas de repaso

- ¿Qué problema resuelve el adaptador?
- ¿Qué rutas necesitan servidor y cuáles no?
- ¿Qué costo tiene renderizar en el servidor en un plan gratuito?

**Cierre:** el estudiante distingue cuándo su proyecto es estático y cuándo no.

---

# Sesión 4 — Aplicación completa: web, API y base de datos

**Duración:** 60 minutos · **Objetivo:** separar responsabilidades y conectar un
frontend con una API y una base de datos reales.

## 4.1 Idea clave

Netlify sirve la web. La lógica que valida contraseñas, calcula y guarda datos
necesita un servidor y una base de datos. Son tres piezas que se comunican por
HTTP.

| Pieza | Función | Servicio de ejemplo |
|---|---|---|
| Web | Interfaz | Netlify |
| API | Reglas y datos | Render, Fly.io, Railway |
| Base de datos | Almacenamiento | Neon, Supabase |

**Analogía:** el restaurante. El salón es la web, la cocina es la API y la
despensa es la base de datos. El cliente no entra a la despensa.

## 4.2 El dibujo que hay que dejar en el pizarrón

```text
Navegador  →  Netlify (HTML/JS)  →  API (HTTPS)  →  PostgreSQL
```

Cada flecha implica una configuración: dirección, permisos y seguridad.

## 4.3 CORS: el error que aparece siempre

CORS es una regla del navegador: un sitio solo puede llamar a una API que lo
autorice explícitamente.

```ts
// En la API: solo aceptar pedidos desde la web publicada
app.enableCors({ origin: "https://mi-tienda.netlify.app", credentials: true });
```

Si el origen no coincide **exactamente** (sin barra final, con `https`), la
petición falla con "Failed to fetch". Es el error más común de la sesión.

## 4.4 Variables en cada lado

| Dónde | Variable | Para qué |
|---|---|---|
| Netlify | `NEXT_PUBLIC_API_URL` | que la web sepa dónde está la API |
| API | `DATABASE_URL` | conexión a la base |
| API | `WEB_ORIGIN` | CORS |
| API | `JWT_SECRET` | firmar sesiones |

## 4.5 Migraciones y datos

Una migración es un cambio versionado del esquema de la base. Se aplican con
`prisma migrate deploy` (o el comando del ORM que se use). Los datos se copian
aparte, con `pg_dump` y `psql`.

**Para el docente:** enfatice que esquema y datos son dos pasos distintos.

## 4.6 Práctica guiada

1. Crear una base PostgreSQL gratuita y copiar su cadena de conexión.
2. Aplicar las migraciones del proyecto.
3. Desplegar la API con las variables correspondientes.
4. Verificar `GET /api/health`.
5. Publicar la web con la URL de la API y probar un inicio de sesión.

## 4.7 Error típico

> "El login dice Failed to fetch."

Revisar en orden: URL de la API, `WEB_ORIGIN` en la API, y que el redeploy se
haya hecho después de cambiar la variable.

## 4.8 Ejercicio

Dibujar el diagrama de su propio proyecto con las tres piezas y las flechas,
indicando qué variable configura cada flecha.

## 4.9 Preguntas de repaso

- ¿Por qué la base de datos no va en Netlify?
- ¿Qué es CORS y quién lo aplica?
- ¿Qué pasa si se cambia el dominio de la web?

**Cierre:** cada equipo debe tener web, API y base conectadas.

---

# Sesión 5 — Límites, seguridad y diagnóstico

**Duración:** 55 minutos · **Objetivo:** leer los límites de un plan gratuito,
proteger credenciales y resolver fallas con método.

## 5.1 Idea clave

Los planes gratuitos tienen presupuesto, no tiempo ilimitado. Saber cuánto se
consume permite decidir sin sorpresas.

## 5.2 Cómo se mide el consumo hoy

Netlify usa **créditos** mensuales. Todo sale del mismo presupuesto:

| Uso | Costo | Techo con 300 créditos |
|---|---|---|
| Deploy a producción | 15 créditos | ~20 deploys |
| Deploy preview | 0 | ilimitados |
| Ancho de banda | 20 créditos por GB | ~15 GB |
| Peticiones web | 2 créditos por 10 000 | ~1,5 millones |

**Analogía:** una tarjeta de transporte con saldo. Cada viaje descuenta, y las
vueltas de prueba no cuestan.

## 5.3 Qué pasa al agotar los créditos

El sitio se **pausa** hasta el siguiente ciclo. No hay cobro automático en el
plan gratuito, pero tampoco servicio.

## 5.4 Límites de otros servicios

| Servicio | Límite típico del plan gratuito |
|---|---|
| API (Render) | se duerme a los 15 min; ~1 min para despertar |
| Base (Neon) | 1 GB de datos, cómputo mensual limitado |
| Funciones Netlify | 60 s por ejecución, 1 GB de memoria |

## 5.5 Seguridad mínima antes de publicar

1. `.env` fuera del repositorio; nunca en el historial de Git.
2. Secretos largos y distintos entre desarrollo y producción.
3. Cambiar las cuentas de demostración antes de compartir el enlace.
4. Rotar credenciales si se filtraron en un chat o una captura.
5. Usar HTTPS en todo (Netlify lo da por defecto).

**Para el docente:** pida a los alumnos buscar `password` y `secret` en su
repositorio. Es una práctica que rara vez se olvida después.

## 5.6 Método de diagnóstico

| Síntoma | Causa probable | Verificación |
|---|---|---|
| 404 con navegador de archivos | `publish` incorrecto | revisar el build |
| 404 en rutas internas | falta adaptador | probar `/producto/1` |
| 401 con pantalla de login | sitio privado | Access control → Public |
| Failed to fetch | CORS o URL vieja | revisar `WEB_ORIGIN` y redeploy |
| Build falla con ERR_PNPM_IGNORED_BUILDS | scripts bloqueados | `allowBuilds` |
| Primera carga lenta | API dormida | plan pago o esperar |

## 5.7 Práctica guiada

1. Provocar a propósito un error de CORS y documentar el mensaje exacto.
2. Corregirlo cambiando `WEB_ORIGIN`.
3. Revisar el consumo en el panel de Netlify.
4. Ejecutar la lista de seguridad de 5.5 sobre su proyecto.

## 5.8 Ejercicio final de la sesión

Entregar un informe de una página con: URL del sitio, URL de la API, errores
encontrados, cómo se diagnosticaron y cómo se corrigieron.

## 5.9 Preguntas de repaso

- ¿Qué gasto tiene un deploy de prueba?
- ¿Por qué una API dormida no es un error?
- ¿Qué se debe rotar primero si una clave se filtra?

---

# Actividad integradora

**Duración:** 2 sesiones o trabajo extraclase · **Peso sugerido:** 40 %

## Enunciado

Cada equipo debe publicar una aplicación funcional de principio a fin:

1. Un repositorio en GitHub con frontend y, si aplica, API.
2. Un sitio en Netlify accesible por URL.
3. Una API desplegada y conectada a una base de datos.
4. Un usuario de prueba que permita iniciar sesión.
5. Un documento de una página con la arquitectura y las variables usadas
   (sin mostrar sus valores).

## Rúbrica

| Criterio | Puntos |
|---|---|
| El sitio abre y navega sin errores | 20 |
| El build está versionado en `netlify.toml` | 10 |
| Variables configuradas correctamente | 15 |
| La API responde y la web la consume | 20 |
| No hay secretos en el repositorio | 15 |
| Documentación clara y correcta | 10 |
| Explicación oral del flujo completo | 10 |

## Defensa oral (5 minutos por equipo)

El docente pregunta: qué hace cada servicio, qué pasa si se cae la API, dónde
está la base de datos y qué se gastaría si el sitio recibe 10 000 visitas.

---

# Glosario

| Término | Definición breve |
|---|---|
| **Build** | Proceso que convierte el código fuente en archivos publicables |
| **CDN** | Red de servidores que entrega archivos desde el más cercano |
| **Deploy** | Publicación de una versión del sitio |
| **Deploy preview** | Versión de prueba, sin publicar en producción |
| **Variable de entorno** | Valor de configuración externo al código |
| **CORS** | Regla del navegador que limita qué sitios pueden llamar a una API |
| **Migración** | Cambio versionado del esquema de la base de datos |
| **Serverless** | Función que se ejecuta solo cuando se la llama |
| **Crédito** | Unidad de consumo del plan de Netlify |
| **Adaptador** | Pieza que traduce un framework al formato del hosting |

---

# Solucionario rápido de errores

| Error | Qué revisar primero |
|---|---|
| 404 en la raíz | `publish` y existencia de `index.html` |
| 404 solo en rutas internas | adaptador o redirecciones |
| 401 al abrir el sitio | protección de acceso del proyecto |
| "Failed to fetch" | CORS, URL de API y redeploy |
| Build en rojo | versión de Node, lockfile y scripts de instalación |
| Cambios que no aparecen | caché del navegador o deploy no publicado |
| Lentitud en la primera visita | servicio de API dormido |

---

# Anexo: planificación sugerida

| Semana | Sesión | Entregable del alumno |
|---|---|---|
| 1 | Sesión 1 | Sitio estático publicado |
| 2 | Sesión 2 | Proyecto con `netlify.toml` y variables |
| 3 | Sesión 3 | Ruta dinámica funcionando |
| 4 | Sesión 4 | Web + API + base conectadas |
| 5 | Sesión 5 | Informe de diagnóstico y checklist de seguridad |

**Nota final para el docente:** el objetivo no es memorizar el panel de Netlify,
sino entender el recorrido del dato: del repositorio al build, del build al CDN,
y del navegador a la API. Quien comprende ese recorrido puede usar cualquier
otro servicio de despliegue.
