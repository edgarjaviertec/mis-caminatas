# Caminatas

Web que lee el export de **Simple Health Export CSV** del iPhone y muestra los pasos diarios, las caminatas del día y las calorías quemadas en cada una. Reemplaza a una app de escritorio en Python que vive en otro repositorio.

Se publica gratis en Netlify como sitio estático. Todo se procesa en el navegador: los datos de salud nunca salen del equipo del usuario.

## Filosofía

- **KISS extremo.** El código debe poder leerlo y mantenerlo una sola persona.
- **KISS está por encima de DRY.** Solo se extrae código repetido si la función resultante tiene un nombre claro y el resultado se lee mejor. Si para reutilizar hay que agregar parámetros o condiciones, mejor dejarlo repetido.
- **La legibilidad está por encima de la abstracción.** Ante la duda, la opción más obvia.
- Nada de trucos: sin ternarios anidados, sin one-liners ingeniosos, sin metaprogramación.

## Idioma y nombres

- Todo el código en **español estricto**: archivos, carpetas, clases, funciones, variables, constantes, clases CSS e ids HTML.
- **Sin tildes ni ñ** en código y nombres de archivo (`calorias`, `anio`). El texto visible para el usuario y los comentarios sí las llevan.
- **Nunca variables de una letra** (`a`, `b`, `d`, `i`…), tampoco en bucles. Nada de abreviaturas inventadas (`tam`, `ini`, `vel`). Abreviaturas permitidas: `km`, `kmh`, `kcal`, `csv`, `zip`, `id`, `url`.
- Excepciones inevitables: palabras del lenguaje y APIs del navegador, APIs de librerías (`fflate.unzipSync`, clases `fa-*`), columnas del CSV (`startDate`, `value`…), identificadores `HKQuantityTypeIdentifier…` y archivos de nombre fijo (`index.html`, `netlify.toml`, `README.md`, `CLAUDE.md`, `.gitignore`).
- **Regla de frontera:** lo que viene en inglés desde afuera se traduce en cuanto entra. El lector CSV entrega objetos con claves en español (`inicio`, `fin`, `valor`, `unidad`, `fuente`).

| Elemento | Formato | Ejemplo |
|---|---|---|
| Archivos y carpetas | kebab-case | `grafico-barras.js` |
| Funciones | camelCase, verbo en infinitivo | `construirLineaTiempo()` |
| Variables | camelCase, sustantivo | `pasosPorDia` |
| Booleanos | prefijo `es`, `esta`, `tiene` | `estaSeleccionado` |
| Constantes | MAYUSCULAS_CON_GUION_BAJO | `META_PASOS` |
| Clases CSS e ids | kebab-case | `zona-arrastre`, `grafico-pasos` |
| Valores de texto internos | kebab-case | `"caminata-corta"` |

Glosario (usar siempre la misma palabra): `grafico`, `paso`, `caminata`, `caminata-corta`, `sentado`, `muestra`, `segmento`, `tramo`, `linea-tiempo`, `meta`, `pisos`, `advertencia`, `pantalla`, `tablero`, `zona-arrastre`. Niveles de caminata: `recreativo`, `saludable`, `optimo`, `intenso`.

## Estilo de código

- Punto y coma siempre, comillas dobles, indentación de 4 espacios (JS, CSS y HTML).
- Sin JSDoc. Solo un comentario `//` breve encima de lo que lo necesite, explicando **el porqué**, no el qué.
- Sin números mágicos: constantes con nombre (`ALTO_MINIMO_PARA_TEXTO_INTERIOR`).
- Salir temprano (`if (...) return;`) en vez de anidar condiciones.
- Bucles `for...of` legibles antes que cadenas de `reduce/map/filter`.
- **Nada de emojis** en ninguna parte: interfaz, código, comentarios, salida de pruebas ni commits.

## JavaScript

- Sin frameworks, sin build, sin npm, sin `package.json`.
- **Scripts clásicos**, sin `import`/`export`. Se cargan con `<script>` al final del `<body>` en orden de dependencia; `aplicacion.js` siempre al final. La app debe funcionar abriendo `index.html` con doble clic.
- Todo es global: los nombres deben ser únicos y descriptivos.
- Funciones y objetos planos en vez de clases. Sin clases de error propias: `throw new Error("mensaje")`.
- El estado de la app vive en un solo objeto dentro de `aplicacion.js`.
- Navegadores: Safari iOS 16+ y las dos últimas versiones de Chrome, Edge, Firefox y Safari Mac. Sin polyfills.

## CSS

- Estilos propios, **sin framework CSS**. Fuente del sistema, Flexbox, modo oscuro con `prefers-color-scheme`, mobile-first con un solo `@media` para pantallas anchas.
- **ITCSS, sin BEM**, en un solo archivo `css/estilos.css` con seis secciones en este orden, cada una con su título en comentario: CONFIGURACION, GENERICOS, ELEMENTOS, OBJETOS, COMPONENTES, UTILIDADES.
- Colores y medidas solo como variables en CONFIGURACION.
- Clases sin prefijo de capa y con nombres descriptivos: `.zona-arrastre`, `.zona-arrastre-texto`.
- Estados como clase aparte con `esta-` o `tiene-`: `.zona-arrastre.esta-activa`. Si existe un atributo nativo (`hidden`, `aria-selected`), se usa ese.
- **Los ids son solo para JS**; el CSS solo usa clases.
- Sin anidamiento CSS, selectores de máximo dos niveles, `!important` solo en UTILIDADES.

## Dependencias externas

Solo por CDN en el HTML, con versión fija e `integrity`:
- **fflate** (jsDelivr) para leer el ZIP. Global `fflate`.
- **Font Awesome** gratuito (cdnjs) para los iconos: `<i class="fa-solid fa-…" aria-hidden="true"></i>` junto a texto.
- Iconos: aviso `fa-circle-info`, error `fa-triangle-exclamation`, volver `fa-arrow-left`, caminata `fa-person-walking`, caminata corta `fa-shoe-prints`, sentado `fa-chair`, calorías `fa-fire`, recreativo `fa-feather`, saludable `fa-circle-check`, óptimo `fa-dumbbell`, intenso `fa-bolt`.
- La escalera de pisos del gráfico se dibuja a mano en el canvas (no se usa Font Awesome dentro del canvas).

## Estructura

```
index.html
manifiesto.webmanifest
netlify.toml
css/estilos.css
js/formato.js
js/lector-csv.js
js/procesador-salud.js
js/lector-archivos.js
js/grafico-barras.js
js/linea-tiempo.js
js/aplicacion.js
iconos/
pruebas/datos/*.csv
pruebas/datos-referencia.json
pruebas/ejecutar-pruebas.js
```

## Datos de entrada

- Solo los CSV de Simple Health Export CSV. Entrada principal: el `.zip` del export (CSV en la raíz). También CSV sueltos y, en escritorio, una carpeta arrastrada.
- Se buscan por el prefijo `HKQuantityTypeIdentifier<Metrica>_`. Obligatorio: `StepCount`. Opcionales: `ActiveEnergyBurned`, `DistanceWalkingRunning`, `FlightsClimbed`, `WalkingSpeed`.
- Primera línea `sep=,`. Columnas leídas por nombre, no por posición. Hay campos entre comillas con comas dentro.
- Fechas en UTC (`2026-08-01 15:42:52 +0000`); los días se agrupan en hora local.
- Las muestras que cruzan la medianoche se reparten entre los días según el tiempo que pasan en cada uno (igual que Salud).

## Pruebas

- Un solo comando: `node pruebas/ejecutar-pruebas.js`. Node se usa solo para ejecutar las pruebas, sin paquetes.
- El ejecutor carga los mismos scripts de la app, en el mismo orden que `index.html`.
- La referencia (`datos-referencia.json`) se generó con la app de Python ya corregida y es el resultado esperado. Si la lógica cambia a propósito, se actualiza a mano junto con el cambio.
- La referencia usa la zona horaria `America/Cancun` (guardada en el JSON); el ejecutor la fija para que las pruebas den lo mismo en cualquier equipo y en Netlify.
- Antes de cada commit, todas las pruebas deben pasar. Netlify corre el mismo comando y no publica si alguna falla.

## Privacidad

- El repositorio es público. **Nunca subir datos reales** (ZIP ni CSV del export).
- Los datos de `pruebas/datos/` están recortados y con fechas desplazadas.

## Commits

- **Claude nunca ejecuta `git commit` ni `git push`.** Solo entrega el texto del mensaje; el usuario hace el commit.
- En español, con prefijo en minúscula: `agrega:`, `corrige:`, `cambia:`, `elimina:`, `documenta:`. Una línea de resumen y, si hace falta, un párrafo breve con el porqué.
