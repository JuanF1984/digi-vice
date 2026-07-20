# Troubleshooting

Síntomas conocidos, ordenados por dónde suelen aparecer, con su causa real
(no hipótesis) según lo verificado en este proyecto.

## "Funciona en local pero en el navegador la variable no está"

**Causa**: `NEXT_PUBLIC_*` accedida dinámicamente
(`process.env[algunaVariable]` en vez de `process.env.NEXT_PUBLIC_X`
literal). El compilador de Next.js solo puede inlinear en el bundle del
navegador los accesos que puede analizar estáticamente — un acceso dinámico
sobrevive intacto al bundle del cliente, donde no existe `process.env` real,
así que el valor llega `undefined` **solo en el navegador** (el servidor,
Node puro, lo sigue leyendo bien). Ver el comentario extenso en
`lib/supabase/env.ts` y [DECISIONS.md](./DECISIONS.md).

**Cómo confirmarlo**: si algo funciona en un Server Component/Route Handler
pero falla específicamente en un Client Component o en código que corre en
el navegador, sospechar de esto antes que de nada más.

**Fix**: acceder siempre como `process.env.NEXT_PUBLIC_SUPABASE_URL`
(member expression literal, escrito entero), nunca vía variable/parámetro.

## Traducción guardada en Supabase pero la ficha muestra inglés

Ver el caso real completo en [DECISIONS.md](./DECISIONS.md) (incidente de
julio 2026). Orden de chequeo recomendado, de más barato a más caro:

1. **¿Es realmente Production, y coinciden las env vars con las que usaste
   para guardar la fila?** Vercel separa env vars por ambiente (Production /
   Preview / Development) — que estén bien en uno no dice nada del otro.
2. **¿Se hizo redeploy después de cambiar la variable?** Cambiar el valor en
   el dashboard de Vercel no afecta deploys ya corriendo.
3. **¿El hash coincide?** Recalcular `computeSourceHash` sobre la
   descripción **actual** de Digi-API para ese Digimon y compararlo con el
   `source_hash` almacenado. Si Digi-API cambió el texto después de guardar
   la traducción, el hash ya no coincide — no es un bug, es un texto fuente
   distinto (habría que retraducir).
4. **¿La lectura anónima funciona?** Repetir la query exacta de
   `getSavedTranslation` contra la REST API de Supabase con la publishable
   key, sin sesión (ver receta en [SUPABASE.md](./SUPABASE.md)).
5. **Logs del servidor**: `getSavedTranslation` nunca lanza — cualquier
   error (config, red, Supabase) se loguea con `console.error` y devuelve
   `null`, que la UI trata igual que "no hay traducción". Sin mirar los
   logs, un error de configuración es indistinguible de "no existe". Ver
   "cómo revisar logs" en [SUPABASE.md](./SUPABASE.md).

## Consulta a Supabase devuelve 200 con `data: []`

**No es un error.** Un `select` que no encuentra filas devuelve status 200,
`data: []`, `error: null` — exactamente igual tanto si la fila no existe
como si existe pero RLS la filtró para el rol que hizo la consulta. HTTP no
distingue esos dos casos. Para diferenciarlos:

- Repetir la misma consulta con la `service_role` key **directamente en la
  consola/API de Supabase** (nunca desde código de la app — ver
  [DECISIONS.md](./DECISIONS.md)) para confirmar si la fila existe de
  verdad, sin RLS de por medio.
- Si con `service_role` la fila aparece pero con la publishable key no,
  el problema es la policy de `SELECT` (falta, o no aplica al rol que
  se está usando) — no el dato.

## Nombres de Digimon codificados con `%20`

Rutas como `/digimon/Metal%20Greymon` son esperadas y correctas — nombres de
Digi-API con espacio (`"Metal Greymon"`) se codifican con
`encodeURIComponent` en todos los `href`/`router.push` del proyecto
(`SearchBar`, `DigimonCard`, `EvolutionRow`, `AnimeLineRow`, etc.).

**Detalle no obvio confirmado en runtime** (comentario en
`lib/digimon/format.ts:decodeDigimonName`): en Next.js 16.2.10, el mismo
segmento dinámico `[name]` llega **decodificado** a `generateMetadata`
("Lady Devimon") pero **crudo/codificado** al componente de página ("Lady%20
Devimon") — confirmado logueando ambos. `decodeDigimonName` llama
`decodeURIComponent` incondicionalmente porque decodificar un string ya
decodificado (sin secuencias `%`) es un no-op seguro; una secuencia `%`
malformada cae a devolver el valor crudo en vez de lanzar. Si se toca esa
función, no asumir que `params.name` siempre viene en un solo estado de
codificación.

## El scroll del catálogo "salta" o no vuelve a donde estaba

Comportamiento esperado: `DigimonCatalog` restaura scroll + lista completa
desde un snapshot (`lib/digimon/catalogCache.ts`) en un `useLayoutEffect`
**antes del primer paint** al volver de una ficha. Si esto falla:

- Confirmar que el snapshot no superó `MAX_AGE_MS` (30 minutos) — pasado
  ese tiempo se ignora a propósito.
- Confirmar que `SNAPSHOT_VERSION` no cambió sin que el shape de
  `CatalogSnapshot` cambiara junto (o viceversa) — un mismatch hace que el
  snapshot viejo se descarte silenciosamente.
- `sessionStorage` deshabilitado (navegación privada estricta, cuota
  excedida) degrada correctamente al snapshot en memoria de módulo, que solo
  sobrevive dentro de la misma pestaña sin recarga dura — es la única
  degradación esperada, no un bug.

## Translator API no disponible en celular

**Esperado, no es un bug.** `window.Translator` es una API de Chrome de
escritorio (modelo on-device). En cualquier navegador donde no exista,
`TranslatedDescription` cae a `unavailable` y muestra el texto original.
Esta es exactamente la razón por la que existe el respaldo de Supabase (ver
[DECISIONS.md](./DECISIONS.md)) — si un Digimon nunca fue traducido antes
desde un navegador compatible, no hay traducción guardada, y un celular
**sin** ese respaldo mostrará inglés legítimamente (no es un error a
corregir en código, es la ausencia de dato).

## Por qué se ve inglés como último recurso

Orden real, de mayor a menor prioridad, en `TranslatedDescription.tsx`:
`isAlreadySpanish` (Digi-API ya en español) → `savedText` (Supabase) →
Translator API del navegador → texto original (inglés, o japonés en los
pocos casos sin descripción en inglés). Ver el detalle completo en
[ARCHITECTURE.md](./ARCHITECTURE.md#traducción-con-translator-api). Ver
inglés en pantalla es correcto y esperado cuando ninguna de las capas
anteriores resolvió — no asumir que es un bug sin antes chequear si
efectivamente hay una traducción guardada para ese texto fuente exacto.

## Cómo revisar logs de Vercel y Supabase

Ver la sección dedicada en [SUPABASE.md](./SUPABASE.md#cómo-verificar-logs)
— incluye los prefijos exactos de `console.error` a buscar y el comando de
`curl` para probar lectura anónima sin depender de un dispositivo real.
