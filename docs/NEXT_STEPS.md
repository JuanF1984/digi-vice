# Próximos pasos

Lista de mejoras pendientes e ideas, no comprometidas a un plazo. Nada de
esta lista está implementado hoy — si algo de acá se hace, mover el punto a
[DECISIONS.md](./DECISIONS.md) (con el porqué real) y borrarlo de aquí.

## Evoluciones que todavía pueden corregirse

- Las 15 líneas curadas (`lib/digimon/animeEvolutionLines.ts`) cubren
  Adventure, Adventure 02 y Tamers. Quedan digimon de esas mismas series sin
  línea curada (formas alternativas, digivolutions especiales de película,
  etc.) que hoy solo aparecen en "Otras evoluciones posibles" (el grafo
  crudo de Digi-API).
- Si se detecta un `digiApiName` incorrecto en una línea existente, el
  proceso para corregirlo está documentado en
  [DIGIMON_DATA.md](./DIGIMON_DATA.md#cómo-agregar-una-nueva-línea-curada-o-corregir-una-existente).

## Revisión manual de traducciones

`review_status` ya soporta `"reviewed"` y `"corrected"` a nivel de datos y de
lógica (`getSavedTranslation` los prioriza por sobre `"automatic"`; el Route
Handler nunca pisa una fila ya `reviewed`/`corrected`) — pero **no existe
ninguna forma de marcar una fila así hoy**. Todo lo que se guarda queda en
`"automatic"` para siempre. Falta:

- Un mecanismo (UI o manual, vía SQL/Table Editor) para pasar una traducción
  de `automatic` a `reviewed` una vez que alguien la revisó a mano.
- Eventualmente, `corrected` para cuando la traducción automática tenía un
  error y alguien escribió una versión corregida a mano (reemplazando
  `translated_text`).

## Posible panel para editar traducciones

`/admin` hoy solo tiene login/logout (`app/admin/page.tsx`). Una extensión
natural, ya que la autenticación y RLS para la única cuenta autorizada ya
existen:

- Listar traducciones guardadas (filtrando por `review_status`).
- Editar `translated_text` a mano y marcar la fila como `corrected`.
- Marcar una traducción automática como revisada (`reviewed`) sin cambiar el
  texto.

Esto reutilizaría el mismo cliente Supabase de servidor
(`lib/supabase/server.ts`) y las mismas políticas RLS — la escritura ya está
gateada a la cuenta autorizada, solo falta la interfaz.

## Mejoras visuales

No hay nada concreto planeado documentado en el código — cualquier cambio de
diseño debería mantener la identidad de "Digivice" (chasis claro, pantalla
LCD oscura embebida) descripta en el README principal.

## Nuevas series

El patrón para sumar una serie curada nueva (por ejemplo Frontier, Data
Squad, Savers) ya está documentado paso a paso en
[DIGIMON_DATA.md](./DIGIMON_DATA.md#cómo-agregar-una-nueva-línea-curada-o-corregir-una-existente) —
agregar el valor a `AnimeSeries`, su label, sus líneas, y opcionalmente una
sección curada en el home. No requiere tocar servicios ni componentes de UI.

## Ideas futuras de hardware (especulativo, sin implementar)

La identidad visual del proyecto ya está inspirada en un Digivice físico.
Como idea a futuro, sin ningún trabajo de código empezado ni comprometido:
un compañero de hardware real (lector NFC/QR de figuras físicas, o una
pantalla externa tipo e-ink) que dispare la misma búsqueda que hoy hace
`SearchBar`. Esto es una idea de brainstorming, no un requerimiento — no
hay decisiones técnicas tomadas al respecto todavía.
