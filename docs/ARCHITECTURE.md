# Arquitectura

## Next.js App Router y el "Proxy"

El proyecto usa Next.js 16.2.10 con App Router. `AGENTS.md` (raíz del repo)
advierte explícitamente que esta versión tiene cambios que rompen supuestos de
versiones anteriores — el ejemplo concreto que ya afectó a este proyecto es
que **`middleware.ts` fue renombrado a `proxy.ts`**, con una función exportada
`proxy` en vez de `middleware` (mismo lugar en el árbol de archivos, mismo
modelo de ejecución, otro nombre). Ver `proxy.ts` (raíz) y
`lib/supabase/proxy.ts`.

`proxy.ts` corre en (casi) todas las rutas (`matcher` excluye estáticos,
imágenes y favicon) y llama a `updateSession()`, que:

- Refresca las cookies de sesión de Supabase Auth en cada request, para que
  los Server Components siempre vean una sesión no expirada.
- Si `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no
  están configuradas, **no rompe la app**: devuelve la respuesta sin tocar
  nada, para que el catálogo y las fichas (públicas) sigan funcionando aunque
  Supabase no esté configurado. Solo `/admin` y `/api/translations` dependen
  realmente de la sesión.

## Server Components y Client Components relevantes

Regla general del proyecto: todo lo que puede ser Server Component, lo es.
Los Client Components están aislados a lo mínimo que necesita algo del
navegador (estado, efectos, Web APIs).

| Componente | Tipo | Por qué |
|---|---|---|
| `app/page.tsx` | Server | Fetch a Digi-API en el servidor, sin JS necesario para pintar el catálogo inicial. |
| `app/digimon/[name]/page.tsx` | Server | Fetch a Digi-API + lookup de traducción en Supabase, todo server-side. |
| `components/digimon/DescriptionPanel.tsx` | Server | Solo pasa props a `TranslatedDescription`; no necesita ser cliente. |
| `components/digimon/TranslatedDescription.tsx` | **Client** | Depende del Translator API del navegador (`window.Translator`), `sessionStorage` y efectos. |
| `components/digimon/SpeakButton.tsx` | **Client** | Depende de `speechSynthesis` del navegador. |
| `components/digimon/DigimonCatalog.tsx` | **Client** | Scroll infinito: `IntersectionObserver`, estado, `sessionStorage`. |
| `components/digimon/SearchBar.tsx` | **Client** | Input controlado + navegación con `useRouter`. |
| `components/digimon/DigimonImage.tsx` | **Client** | `useState` para fallback de imagen rota (`onError`). |
| `app/admin/LoginForm.tsx` / `LogoutButton.tsx` | **Client** | Llaman al cliente Supabase de navegador (`lib/supabase/client.ts`). |
| `components/digimon/AnimeLineTabs.tsx` | **Client** | Estado de tab activo (solo cuando un Digimon pertenece a más de una línea curada). |
| `components/digimon/AnimeLineRow.tsx`, `EvolutionRow.tsx`, `DigimonCard.tsx`, `DigimonGrid.tsx`, etc. | Server | Presentacionales, sin estado de navegador. |

## Servicios de Digi-API

- **`lib/digimon/api.ts`** — única capa que hace `fetch` a
  `https://digi-api.com/api/v1`. Traduce las particularidades de Digi-API a
  errores tipados:
  - `fetchDigimonByName(name)` → `GET /digimon/{name}`, `revalidate: 3600`.
    Digi-API devuelve **400** (no 404) para un nombre inexistente; ambos se
    tratan como `DigimonNotFoundError`. Si falla, intenta un alias
    (`resolveNameAlias`) antes de propagar el error.
  - `fetchDigimonListPage(page, pageSize)` → `GET /digimon?page=&pageSize=`
    (nota: el query param es `pageSize`, camelCase — `pagesize` en minúsculas
    es ignorado silenciosamente y Digi-API vuelve a su default de 5).
  - Cualquier otro status no-2xx es un `DigimonApiError`.
- **`services/digimon.ts`** — capa que consumen las páginas:
  - `getDigimon(name)` → `fetchDigimonByName` + `normalizeDigimon`.
  - `getDigimonPage(page, pageSize)` → arma una página del catálogo completo
    ("Archivo completo"), pidiendo el detalle de cada item de la lista (la
    lista de Digi-API solo trae id/nombre/imagen) y **excluyendo** los IDs de
    los protagonistas curados (`getCuratedProtagonistIds`, cacheados en
    memoria de módulo por 1 hora) para que no aparezcan duplicados más abajo
    en el scroll.
  - `getCuratedHomeSections()` — resuelve los 15 protagonistas curados
    (`CURATED_SERIES_SECTIONS`) en paralelo, una sola vez por request.
  - Un fallo puntual al resolver un item (`Promise.allSettled`) se descarta
    con un `console.error`, sin romper la página completa.

## Normalización de datos

**`lib/digimon/normalize.ts`** convierte la respuesta cruda de Digi-API
(`DigimonDetailResponse`) al tipo `Digimon` que consume la UI. Lo más
relevante para la ficha traducida es `pickDescription`:

- Prioridad fija de idioma: `["es", "es_la", "en_us", "en", "jap"]`. Se
  recorre en ese orden y se devuelve la **primera** coincidencia; si ninguna
  coincide, se usa la primera descripción de la lista tal cual venga.
- El texto se normaliza siempre igual: `text.replace(/\s+/g, " ").trim()`
  (colapsa espacios/saltos de línea, sin quitar tildes ni cambiar
  mayúsculas). Esta es la única normalización de texto fuente en todo el
  proyecto — no hay una segunda regla distinta en ningún otro lugar.
- `es`/`es_la` no existen hoy en Digi-API, pero quedan primeros en la
  prioridad a propósito: el día que Digi-API agregue español nativo, se usa
  automáticamente sin tocar código (`isSpanish` ya lo contempla).

## Alias de nombres

Dos capas, en orden (`lib/digimon/aliases.ts:resolveNameAlias`):

1. `DIGIMON_NAME_ALIASES` — mapa chico y verificado a mano para los casos
   donde Digi-API indexa por el nombre japonés en vez del nombre occidental
   más buscado (hoy: `gatomon → Tailmon`, `veemon → V-mon`).
2. `resolveFamiliarNameAlias` (en `lib/digimon/animeEvolutionLines.ts`) —
   índice inverso construido a partir de **todas** las líneas curadas
   (`familiarName → digiApiName`), para que buscar por el nombre familiar de
   *cualquier* etapa de una línea curada (p. ej. "Biyomon" o
   "MetalGreymon") funcione, no solo los dos casos hardcodeados arriba.

Se usa únicamente cuando la búsqueda exacta por nombre falla
(`fetchDigimonByName`) — nunca como traducción general de texto.

## Scroll infinito

- El servidor (`app/page.tsx`) ya renderiza la página 0 del catálogo
  (`getDigimonPage(0, DIGIMON_PAGE_SIZE)`, `DIGIMON_PAGE_SIZE = 20`).
- `components/digimon/DigimonCatalog.tsx` (Client) continúa desde la página 1
  en adelante, pidiendo a `GET /api/digimon?page=N` (nunca a Digi-API
  directamente desde el navegador — evita CORS y centraliza todo en
  `services/digimon.ts`).
- Dispara la carga con un `IntersectionObserver` sobre un sentinel al final
  de la grilla (`rootMargin: "200px"`), más un botón manual ("Cargar más
  Digimon") como alternativa.
- Guardas contra reentradas: `loadingRef` (ref síncrona, cubre also el doble
  efecto de Strict Mode en dev) y un `AbortController` por carga, para
  descartar respuestas que llegan después de un unmount.
- Deduplica ítems ya vistos con un `Set` de IDs (`seenIdsRef`), porque los
  protagonistas curados se excluyen página a página y esa exclusión no es
  perfecta si Digi-API cambia de orden entre requests.

## Restauración de scroll

`lib/digimon/catalogCache.ts` guarda un snapshot (`items`, `nextPage`,
`hasMore`, `scrollY`) en dos niveles:

1. Una variable de módulo (`memorySnapshot`) — sobrevive a que
   `DigimonCatalog` se desmonte/remonte dentro de la misma pestaña (por
   ejemplo, al entrar a una ficha y volver).
2. `sessionStorage` (clave `digidesk:catalog`) — sobrevive además a una
   recarga dura de esa misma pestaña. Con `SNAPSHOT_VERSION` para invalidar
   snapshots de un shape viejo, y `MAX_AGE_MS` (30 min) para no restaurar
   algo demasiado viejo.

`DigimonCatalog` restaura el snapshot en un `useLayoutEffect` (isomórfico,
no-op en servidor) — **antes del primer paint** — para que nunca se vea un
flash de la página 0 fresca antes de saltar al scroll guardado. Guarda el
snapshot en el cleanup de un efecto que corre una sola vez (al desmontar,
típicamente al navegar a una ficha).

## Líneas evolutivas del anime

Ver también [DIGIMON_DATA.md](./DIGIMON_DATA.md) para el detalle de contenido
curado.

- **`lib/digimon/animeEvolutionLines.ts`** — datos puros: 15 líneas
  (`ANIME_EVOLUTION_LINES`) repartidas en 3 series (`adventure`,
  `adventure02`, `tamers`), cada una con sus `stages` en orden
  (`digiApiName` + `familiarName` opcional). También expone:
  - `CURATED_SERIES_SECTIONS` — protagonistas curados del home, agrupados
    por serie con su título.
  - `getAnimeLinesForDigimon(digiApiName)` — todas las líneas curadas a las
    que pertenece un Digimon (normalmente 0 o 1; algunos digimon compartidos
    como Paildramon o Vikemon pertenecen a 2).
  - `getFamiliarName(digiApiName)` / `resolveFamiliarNameAlias(name)` —
    índices (`Map`, construidos una sola vez y cacheados a nivel módulo)
    nombre-Digi-API ↔ nombre-familiar.
- **`services/animeEvolutionLines.ts:resolveAnimeLines(lines)`** — resuelve
  cada `digiApiName` distinto contra Digi-API **una sola vez** (con
  `Promise.allSettled`, aunque el mismo digimon aparezca en dos líneas
  compartidas), y arma `ResolvedAnimeLine[]` con id/slug/imagen reales. Una
  etapa que falla al resolverse se descarta sin romper el resto.
- **UI**: `AnimeEvolutionLineSection` no renderiza nada si el Digimon actual
  no pertenece a ninguna línea curada. Si pertenece a una sola, usa
  `AnimeLineRow` (fila horizontal con scroll). Si pertenece a más de una
  (comparte etapas entre dos protagonistas), usa `AnimeLineTabs` para elegir
  cuál mostrar.
- Estas líneas curadas se muestran **antes** que las evoluciones crudas de
  Digi-API (`priorEvolutions`/`nextEvolutions`, sección "Otras evoluciones
  posibles" en la ficha), que son un grafo mucho más ruidoso (juegos, cartas,
  otros dispositivos).

## Traducción con Translator API

`components/digimon/TranslatedDescription.tsx` (Client) usa el Translator API
nativo del navegador (`window.Translator`, hoy solo en Chrome de escritorio,
modelo on-device — sin backend, sin API key):

- `toTranslatorSource(digiApiLanguage)` solo intenta traducir si el idioma
  original es inglés (`en_us`/`en`); las descripciones en japonés (raras) se
  dejan como están, para no traducir desde el idioma equivocado.
- Estado (`TranslationState`): `already-spanish | saved | checking |
  preparing | translating | translated | unavailable`.
- Mientras se está resolviendo (`checking`/`preparing`/`translating`) se
  muestra `DecodingPanel`, nunca el inglés — así no hay "flash" de idioma.
- Cualquier fallo (`availability() === "unavailable"`, falta de activación
  del usuario, descarga fallida, error de `translate()`) degrada a
  `unavailable`, que muestra el texto original como último recurso.
- Cache de sesión (`lib/digimon/translationCache.ts`, prefijo
  `digidesk:translate:`) para no re-traducir el mismo texto dos veces en la
  misma pestaña — dos capas igual que `catalogCache.ts` (Map de módulo +
  `sessionStorage`).
- Si la traducción se resuelve por esta vía y `canSaveTranslations` es
  `true`, dispara el guardado automático (ver más abajo) — nunca al revés.

## Lectura de traducciones desde Supabase

Orden de prioridad real (de mayor a menor), implementado en el `useState`
inicial de `TranslatedDescription`:

1. `isAlreadySpanish` (Digi-API ya devolvió español — no ocurre hoy, pero el
   código ya lo contempla).
2. `savedText` — la traducción encontrada en Supabase, calculada
   **server-side** antes de renderizar la ficha.
3. Translator API del navegador.
4. Texto original (inglés, o japonés en los pocos casos sin inglés).

El lookup en Supabase ocurre en el Server Component
(`app/digimon/[name]/page.tsx`), en paralelo con la sesión "optimista" y las
líneas de anime:

```ts
const needsTranslationLookup =
  digimon.description !== null && !digimon.description.isSpanish;

const [savedTranslation, canSaveTranslations, resolvedAnimeLines] = await Promise.all([
  needsTranslationLookup
    ? getSavedTranslation(digimon.id, digimon.description!.text)
    : Promise.resolve(null),
  hasOptimisticSession(),
  resolveAnimeLines(matchingAnimeLines),
]);
```

`services/translations.ts:getSavedTranslation(digimonId, sourceText)`:

1. Calcula `source_hash` con `lib/supabase/hash.ts:computeSourceHash`
   (SHA-256 sobre el texto ya normalizado — ver "Guardado automático" abajo,
   usa exactamente la misma función que el guardado).
2. `select("translated_text, review_status")` en `digimon_translations`,
   filtrando por `digimon_id`, `source_hash` y `target_language = "es"`.
3. Si hay más de una fila (la restricción única debería evitarlo en la
   práctica), ordena por prioridad `corrected > reviewed > automatic` y usa
   la mejor.
4. **Nunca lanza** — cualquier error de Supabase (`error` no nulo) se loguea
   con `console.error` y devuelve `null`; lo mismo si falta la config o hay
   un fallo de red (try/catch exterior). Ver la limitación conocida de esto
   en [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — `null` no distingue "fila
   no encontrada" de "error de configuración/red".

`DescriptionPanel` (Server) pasa `savedTranslation?.text ?? null` como
`savedText` a `TranslatedDescription`, que lo usa directo en el inicializador
de `useState` (no hay hidratación en dos pasos: llega ya resuelto desde el
servidor, así que no hay mismatch de hidratación ni parpadeo de idioma). Los
efectos de traducción del navegador se cortan temprano (`if (savedText)
return`) — el cliente **nunca** pisa una traducción ya encontrada.

## Guardado automático

`app/api/translations/route.ts` (`POST`) — llamado únicamente desde
`lib/digimon/saveTranslation.ts` (fire-and-forget, deduplicado en memoria por
pestaña con un `Set`, nunca bloquea la UI ni muestra error al visitante):

1. Valida el payload de forma independiente de lo que dice el cliente
   (`normalizeText`, límites de longitud, rechazo de `<`/`>` como marcado
   inesperado).
2. Requiere una sesión **verificada** con `supabase.auth.getUser()` (no el
   `getSession()` solo-de-cookie) — 401 si no hay usuario.
3. Recalcula `source_hash` desde `sourceText` en el servidor — el cliente
   nunca manda un hash, así que no hay nada que spoofear ahí.
4. Si ya existe una fila con `review_status` `reviewed` o `corrected`,
   **no la pisa** — devuelve `{ status: "skipped", reason: "already-reviewed" }`.
5. `upsert` con `onConflict: "digimon_id,source_hash,target_language"` (la
   restricción única real de la tabla), con `review_status: "automatic"` y
   `translation_source: "chrome-translator"`.
6. La autorización real de la escritura la hace Postgres RLS
   (`auth.uid()` == la única cuenta autorizada) — la app nunca usa
   `service_role` (ver [DECISIONS.md](./DECISIONS.md)). Un `upsertError.code
   === "42501"` (RLS deniega) se traduce a un 403 explícito, sin ocultarlo
   como error genérico.

## Autenticación /admin

- `/admin` (`app/admin/page.tsx`, Server Component) no está enlazado desde
  ninguna navegación ni `DeviceHeader`, y pide no ser indexado
  (`robots: { index: false, follow: false }`). No tiene seguridad propia más
  allá de eso — la seguridad real es que sin sesión válida no se puede
  escribir nada (RLS).
- `LoginForm.tsx` / `LogoutButton.tsx` (Client) usan
  `lib/supabase/client.ts:createClient()` (cliente de navegador,
  `createBrowserClient`) para `signInWithPassword` / `signOut`. Las cookies
  de sesión que escribe el cliente de navegador las lee después el cliente
  de servidor (`lib/supabase/server.ts`), sincronizadas vía `@supabase/ssr`
  (no `localStorage`).
- No hay "contraseña de admin" propia: Supabase Auth es la única fuente de
  verdad, para una única cuenta autorizada.
- `lib/supabase/session.ts:hasOptimisticSession()` — chequeo **optimista**
  (decodifica la cookie de sesión sin re-verificar contra el servidor de
  Supabase Auth), usado solo para decidir si vale la pena *intentar* postear
  una traducción recién traducida por Chrome. Nunca autoriza nada por sí
  solo — el Route Handler y RLS son quienes deciden de verdad.

## RLS (Row Level Security)

Confirmado por comportamiento observado y por el código (no se relevó el SQL
exacto de las políticas en este documento — si necesitás editarlas, revisalas
en el dashboard de Supabase → **Authentication → Policies** sobre la tabla
`digimon_translations`):

- **Lectura (`SELECT`)**: pública, sin sesión. Verificado en vivo haciendo un
  `select` a la REST API de Supabase usando únicamente la
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (rol `anon`), sin cookies de sesión
  — la fila buscada se devuelve igual. Esto es intencional: cualquier
  visitante (celular sin login incluido) tiene que poder leer traducciones
  ya guardadas.
- **Escritura (`INSERT`/`UPDATE`)**: restringida. El Route Handler exige
  `getUser()` (401 si no hay sesión), y aun con sesión válida Postgres puede
  seguir rechazando el `upsert` (`error.code === "42501"` → 403), según el
  comentario en el código: la policy de escritura compara `auth.uid()`
  contra la única cuenta autorizada. La app nunca usa la `service_role` key
  para saltarse esto.
- **Consecuencia práctica de "lectura pública + RLS activo"**: un `select`
  que no encuentra filas (porque no existen, o porque RLS las filtró) vuelve
  con `data: []` y `error: null` — no hay excepción ni status de error
  distinto. Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Flujo de voz

`components/digimon/SpeakButton.tsx` (Client), usa `speechSynthesis` nativo
(sin servicio de TTS pago):

1. Nunca autoplay — solo arranca con click.
2. Dos utterances en secuencia: primero `digimonName` (siempre en inglés, voz
   `en-US` preferida), pausa de `PAUSE_BETWEEN_UTTERANCES_MS` (220ms), y
   después `text` (la descripción tal como está en pantalla — español si hay
   traducción/`saved`/`translated`, o el original si no).
3. `language` prop indica el idioma real de `text` (`"es"`/`"es_la"` cuando
   es una traducción, o el código de Digi-API del original en el
   fallback) — `TranslatedDescription` decide ese valor
   (`isSpanishNow ? "es" : sourceLanguage`), nunca se fuerza español a mano.
4. Selección de voz explícita con prioridad Latinoamérica-primero
   (`SPANISH_VOICE_PRIORITY`: `es-AR, es-UY, es-MX, ...`), porque las voces
   instaladas varían mucho entre SO/navegador y no hay que confiar en la
   primera voz "es*" que reporte el sistema. `es-ES` es el último recurso.
5. Un contador de sesión (`sessionRef`) invalida cualquier callback pendiente
   (timeout de pausa, o un `onend` de una utterance vieja) apenas el usuario
   para o vuelve a arrancar la lectura, para que detener a mitad del nombre
   nunca deje arrancar la descripción, y detener a mitad de la descripción
   la corte al instante.
