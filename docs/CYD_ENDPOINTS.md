# Endpoints para la CYD (Etapa A)

Documenta `GET /api/digimon/[id]?display=tft` y `GET /api/digimon/[id]/image`,
agregados para que el firmware de la CYD (`cyd-pokedesk-digivice/`, fuera de
este repositorio) pueda mostrar fichas de Digimon, siguiendo el mismo patrón
ya usado por el proyecto hermano de Pokémon. **El firmware todavía no los
consume** — esta etapa es solo el lado del servidor.

## `GET /api/digimon/[id]?display=tft`

### Contrato

```ts
interface DigimonTftResponse {
  version: 1;
  id: number;
  name: string;               // nombre canónico de Digi-API
  levels: string;              // niveles unidos con ", " (puede ser "")
  types: string;                // tipos unidos con ", " (puede ser "")
  attributes: string;           // atributos unidos con ", " (puede ser "")
  description: string;          // recortada a 250 chars, sin partir palabras
  descriptionLanguage: string;  // "es" | "en_us" | "en" | "jap" | ""
  translationStatus:
    | "native"      // Digi-API ya devolvió español (nunca ocurre hoy)
    | "automatic"   // traducción guardada, review_status = automatic
    | "reviewed"    // traducción guardada, review_status = reviewed
    | "corrected"   // traducción guardada, review_status = corrected
    | "original"    // sin traducción guardada; texto tal como vino de Digi-API
    | "missing";    // el Digimon no tiene ninguna descripción
  imageUrl: string;             // absoluta, `${origin}/api/digimon/{id}/image`
}
```

Todos los campos están siempre presentes (nunca se omite una clave), incluso
cuando su valor es `""`.

### Ejemplo real (Agumon, id=1 — verificado en vivo contra Digi-API)

Sin traducción guardada (`translationStatus: "original"`):

```json
{
  "version": 1,
  "id": 1,
  "name": "Agumon",
  "levels": "Child",
  "types": "Reptile",
  "attributes": "Vaccine",
  "description": "A Reptile Digimon with an appearance resembling a small dinosaur, it has grown and become able to walk on two legs. Its strength is weak as it is still in the process of growing, but it has a fearless and rather ferocious...",
  "descriptionLanguage": "en_us",
  "translationStatus": "original",
  "imageUrl": "https://<origin>/api/digimon/1/image"
}
```

Nota: el nivel real de Agumon en Digi-API es `"Child"`, no `"Rookie"` (el
doblaje usa "Rookie"; el dato crudo de Digi-API usa su propia nomenclatura).
Confirmado con `GET https://digi-api.com/api/v1/digimon/Agumon` en vivo.

### Cómo se arma cada campo

- **Ficha**: `services/digimon.ts:getDigimon(id, { signal })` — sin lógica de
  fetch/parseo propia, reutiliza la normalización existente
  (`lib/digimon/normalize.ts`).
- **`levels`/`types`/`attributes`**: `digimon.levels.join(", ")` etc. sobre
  los arrays ya normalizados.
- **Descripción original**: ya resuelta por `pickDescription()` dentro de
  `normalizeDigimon()` (prioridad `es, es_la, en_us, en, jap`).
- **`source_hash`**: calculado por `getSavedTranslation()` internamente
  (`lib/supabase/hash.ts:computeSourceHash`) sobre `digimon.description.text`
  **completo, sin truncar** — el truncado a 250 caracteres se aplica después
  de decidir qué texto mostrar, nunca antes del hash (si se truncara antes,
  el hash no coincidiría con el que calculó el guardado original).
- **Traducción guardada**: `services/translations.ts:getSavedTranslation(digimon.id, digimon.description.text)`,
  sin modificar su lógica de lookup — ver más abajo el único cambio real que
  se le hizo (nombre de campo).
- **`translationStatus`**: refleja el `review_status` real de la fila
  encontrada (`automatic`/`reviewed`/`corrected`), no un genérico `"saved"` —
  así el firmware (o cualquier consumidor futuro) puede distinguir una
  traducción automática de una ya revisada a mano.
- **Recorte de descripción**: `lib/digimon/format.ts:truncateDescription(text, 250)` —
  corta en el último espacio antes del límite (nunca parte una palabra) y
  agrega `"..."` solo si de verdad truncó.
- **`imageUrl`**: `${new URL(request.url).origin}/api/digimon/{id}/image` —
  nunca un dominio hardcodeado.

### Validación del ID

`/^[1-9]\d*$/` — entero positivo estricto, evaluado antes de tocar Digi-API.
Un nombre (aunque tenga espacios/paréntesis, que sí existen en datos reales,
p. ej. `"Nezhamon(Crimson Mode)"`) da `400`, no se intenta resolver por
nombre — este endpoint es deliberadamente solo-por-ID.

### Un Digimon sin descripción

**No es un 404.** Devuelve `200` con `description: ""`, `descriptionLanguage: ""`,
`translationStatus: "missing"` — un Digimon existente sin entrada de
"reference book" es un caso válido, no un error.

### Códigos HTTP

| Caso | Código |
|---|---|
| ID no matchea `/^[1-9]\d*$/` | `400` |
| Digimon inexistente (`DigimonNotFoundError`) | `404` |
| Digi-API no respondió dentro de 8s (timeout propio, ver abajo) | `504` |
| Cualquier otro fallo de red/upstream con Digi-API | `502` |
| Fallo de Supabase al buscar la traducción | **Nunca produce un código propio** — `getSavedTranslation()` nunca lanza (diseño ya existente en el proyecto); degrada a `translationStatus: "original"`, logueado internamente. |

### Timeout — no solo `maxDuration`

`export const maxDuration = 15` en la ruta es una red de seguridad exterior,
**no** el mecanismo de timeout. La llamada real a Digi-API usa un
`AbortSignal.timeout(8000)` explícito, pasado a través de un parámetro
opcional nuevo (`FetchDigimonOptions.signal`) agregado a
`fetchDigimonByName()`/`digiApiFetch()` en `lib/digimon/api.ts` y a
`getDigimon()` en `services/digimon.ts`.

**Por qué es seguro para el resto de la app**: el parámetro es opcional y
por defecto `undefined` — cada llamador existente (`app/page.tsx`,
`app/digimon/[name]/page.tsx`, `getDigimonPage`, `getCuratedHomeSections`)
sigue llamando `getDigimon(name)` sin el segundo argumento, exactamente como
antes; el comportamiento de esos call sites no cambió en absoluto. Solo las
dos rutas nuevas para la CYD pasan un `signal`.

Cuando el timeout dispara, `digiApiFetch()` detecta el `DOMException` con
`name === "TimeoutError"` (comportamiento estándar de `AbortSignal.timeout()`)
y lo distingue de un fallo de red genérico marcando
`DigimonApiError.status = 504` — las rutas nuevas leen ese `status` para
responder `504` en vez de `502`. Ningún código existente inspeccionaba
`DigimonApiError.status` antes de este cambio (confirmado por búsqueda en
todo `app/`), así que agregar el valor `504` no afecta nada existente.

### Headers de caché

```
Content-Type: application/json
Cache-Control: public, max-age=3600
```

Coincide con el `revalidate: 3600` que ya usa `fetchDigimonByName`.

### Logs

Prefijo `[digidesk] [tft]`, consistente con la convención `[digidesk] ...`
ya usada en el resto del proyecto (no se inventa un prefijo nuevo):

```
[digidesk] [tft] id=1 name=Agumon translationStatus=original
[digidesk] [tft] id=1 error de Digi-API: ...
```

Nunca se loguea el texto completo de la descripción ni credenciales.

---

## `GET /api/digimon/[id]/image`

### Fuente original

`digimon.image` (de `getDigimon()`, nunca reconstruida a mano). Verificado en
vivo: `https://digi-api.com/images/digimon/w/Agumon.png` → **PNG, 320×320px,
107 945 bytes** (`Content-Type: image/png`). Si `digimon.image === null` →
`404`.

### Validaciones antes de procesar

1. **`Content-Type` upstream** debe empezar con `image/` — si no, `502`.
   (El endpoint equivalente de `pokemon/` no valida esto; se agrega acá como
   mejora deliberada, no por copiar.)
2. **`Content-Length` declarado** > 3 MB → `502` sin descargar.
3. **Descarga acotada por stream real** (`readBoundedBody()`): lee el body
   con `response.body.getReader()`, cuenta bytes a medida que llegan, y
   **cancela el stream** apenas se supera 3 MB — no confía únicamente en
   `Content-Length` (que puede faltar o mentir).
4. **Timeout explícito** (`AbortSignal.timeout(8000)`) en el fetch de la
   imagen — código enteramente nuevo, no una función compartida, así que no
   hay razón para no ponerle timeout desde el principio.

### Procesamiento (`sharp`)

```ts
sharp(sourceBuffer)
  .resize(160, 160, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .jpeg({ quality: 82 })
  .toBuffer();
```

Mismo pipeline que `pokemon/app/api/pokemon/[id]/image/route.js` (160×160,
fondo blanco, JPEG calidad 82) — elegido por consistencia con lo que ya
espera `image_renderer.cpp` del firmware, no por copiar sin pensar. Se
agrega, a diferencia del original: validación de que el buffer resultante
no esté vacío antes de responder (`500` si lo está).

### Headers de respuesta

```
Content-Type: image/jpeg
Content-Length: <bytes reales>
Cache-Control: public, max-age=604800, immutable
```

### Códigos de error

| Caso | Código |
|---|---|
| ID inválido | `400` |
| Digimon inexistente | `404` |
| Digimon sin imagen (`digimon.image === null`) | `404` |
| Timeout obteniendo el detalle o la imagen | `504` |
| Fallo de red / status no-2xx / `Content-Type` inválido / descarga demasiado grande | `502` |
| `sharp` falla o devuelve un buffer vacío | `500` |

### Logs

```
[digidesk] [image] id=1 bytes=6234
[digidesk] [image] id=1 fallo al procesar con sharp: ...
```

---

## Dependencia `sharp` — qué se verificó antes de agregarla

`sharp` **no era una dependencia directa** de este proyecto — aparecía en
`node_modules` solo como dependencia transitiva (Next.js la usa
internamente para su optimizador de `next/image`, ya activo acá porque este
`next.config.ts`, a diferencia del de `pokemon/`, no tiene
`images.unoptimized: true`). Con pnpm (aislamiento estricto), importar
`sharp` directo en código propio sin declararla como dependencia directa
habría fallado.

Se agregó `"sharp": "^0.34.5"` a `package.json` — **la misma versión ya
resuelta** en `pnpm-lock.yaml` como dependencia transitiva (`^0.34.5` con
semver de 0.x solo permite parches dentro de 0.34.x), para no arriesgar una
resolución distinta a la que ya venía funcionando.

`pnpm-workspace.yaml` **ya tenía** `allowBuilds: { sharp: true }` — no hizo
falta tocarlo.

`next.config.ts` gana `serverExternalPackages: ["sharp"]` +
`outputFileTracingIncludes` para el binario nativo Linux — **verificado
contra el propio `pnpm-lock.yaml` de este proyecto** (no copiado de
`pokemon/`): confirma `@img/sharp-linux-x64@0.34.5` y
`@img/sharp-libvips-linux-x64@1.2.4` como dependencias opcionales ya
resueltas, aunque no estén físicamente instaladas en este equipo (Windows —
solo se bajan los binarios de la plataforma local). El patrón completo
(`ERR_DLOPEN_FAILED` sin este workaround) está documentado como incidente
real ya resuelto en `pokemon/docs/development-notes.md`, para la misma
librería en un proyecto hermano con el mismo stack (Next 16 + Vercel + pnpm).

**Pendiente, no lo hice yo**: correr `pnpm install` para que
`pnpm-lock.yaml` refleje `sharp` como dependencia directa (hoy el lockfile
la tiene solo como transitiva) — no ejecuté ningún comando de build/paquetes,
según la restricción de esta tarea.

## Otros cambios de código (no solo los dos endpoints)

- **`lib/digimon/api.ts` / `services/digimon.ts`**: `signal` opcional
  agregado a `fetchDigimonByName`/`digiApiFetch`/`getDigimon` (ver sección de
  timeout arriba). Sin cambios de comportamiento para ningún llamador
  existente.
- **`services/translations.ts`**: `SavedTranslation.text` renombrado a
  `SavedTranslation.translatedText` (pedido explícito, para que el nombre
  sea claro en el nuevo contrato JSON). Único consumidor afectado:
  `components/digimon/DescriptionPanel.tsx` (una línea), actualizado en el
  mismo cambio. `getSavedTranslation()` **ya devolvía** `reviewStatus`
  correctamente — no descartaba nada, contra lo que se sospechaba antes de
  revisar el código.
- **`lib/digimon/format.ts`**: nueva función `truncateDescription()`
  (aditiva, no toca `formatDexId`/`decodeDigimonName`/`toSpeechLang`
  existentes).

## Qué NO se tocó

`app/digimon/[name]/page.tsx`, `app/page.tsx`, el resto de
`components/digimon/`, `lib/digimon/normalize.ts`, `lib/digimon/aliases.ts`,
`lib/digimon/animeEvolutionLines.ts`, el esquema de `digimon_translations`,
ninguna política RLS, ninguna variable de entorno. El firmware de
`cyd-pokedesk-digivice/` tampoco se tocó — esta etapa es exclusivamente el
lado del servidor.

## Cómo probar

**Navegador** (Production, sin SSO; Preview requiere sesión de Vercel):
```
https://<deployment>/api/digimon/1?display=tft
https://<deployment>/api/digimon/1/image
```

**PowerShell**:
```powershell
Invoke-WebRequest -Uri "https://<deployment>/api/digimon/1?display=tft" | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri "https://<deployment>/api/digimon/1/image" -OutFile agumon.jpg
(Get-Item agumon.jpg).Length
```

### Casos de prueba recomendados

| Caso | Cómo | Qué confirmar |
|---|---|---|
| Digimon con traducción guardada | Un id ya visto desde Chrome de escritorio | `translationStatus` = `automatic`/`reviewed`/`corrected` (no un genérico `"saved"`), `descriptionLanguage: "es"` |
| Digimon sin traducción | Un id nunca visto desde Chrome de escritorio | `translationStatus: "original"` |
| ID inexistente | `/api/digimon/999999?display=tft` | `404` |
| Nombre con espacios | `/api/digimon/Metal%20Greymon?display=tft` | `400` (rechazado por la regex de ID, a propósito) |
| Imagen válida | `/api/digimon/1/image` | `200`, `image/jpeg`, 160×160, `Content-Length` correcto |
| Imagen remota inválida | Difícil de forzar con datos reales; revisar logs si algún id da `502`/`504` en la práctica | Nunca debería llegar un `500` sin loguear la causa |

No compilé, no hice `pnpm install`, no hice commit.
