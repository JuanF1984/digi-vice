# Datos de Digimon

## Digi-API

Fuente única de datos de Digimon: [Digi-API](https://digi-api.com/api/v1),
pública, sin API key. Base URL hardcodeada en `lib/digimon/api.ts`
(`BASE_URL = "https://digi-api.com/api/v1"`).

### Endpoints usados

- `GET /digimon/{name}` (`fetchDigimonByName`) — detalle completo de un
  Digimon por nombre exacto. `revalidate: 3600` (1 hora). Digi-API devuelve
  **400** (no 404) cuando el nombre no existe; el código trata ambos como
  "no encontrado" (`DigimonNotFoundError`).
- `GET /digimon?page={n}&pageSize={size}` (`fetchDigimonListPage`) — lista
  paginada, `page` 0-indexado. Solo trae `id`, `name`, `image` por item — el
  detalle (nivel, tipo, atributo) requiere un fetch aparte por cada uno
  (`getDigimon`).

## Diferencias de nombres

Digi-API a veces indexa un Digimon bajo su nombre japonés original en vez
del nombre occidental del doblaje, que es el que la mayoría busca (por
ejemplo, "Gatomon" no existe como nombre exacto — hay que pedir "Tailmon").
Esto se resuelve en dos capas (`lib/digimon/aliases.ts:resolveNameAlias`,
usado solo cuando la búsqueda exacta falla):

1. **`DIGIMON_NAME_ALIASES`** — mapa chico, verificado a mano contra la API
   real:
   ```ts
   { gatomon: "Tailmon", veemon: "V-mon" }
   ```
2. **Índice inverso de las líneas curadas** (`resolveFamiliarNameAlias`) —
   cualquier `familiarName` de cualquier etapa de las 15 líneas curadas
   resuelve a su `digiApiName` real. Por ejemplo, buscar "Biyomon" resuelve
   a "Piyomon" (el nombre real en Digi-API), "MetalGreymon" resuelve a
   "Metal Greymon" (con espacio).

## Nombres familiares vs. nombres internos

- **Nombre interno / canónico**: el que usa Digi-API (`digiApiName`), es el
  único valor que se usa para pedir datos a la API y para armar la URL de la
  ficha (`/digimon/{slug}`).
- **Nombre familiar** (`familiarName`): el que reconocería alguien que vio el
  anime doblado/subtitulado, mostrado en la UI en su lugar
  (`getFamiliarName(digiApiName)`, `lib/digimon/animeEvolutionLines.ts`).
  Si un Digimon no pertenece a ninguna línea curada, `getFamiliarName`
  devuelve el nombre de Digi-API sin cambios (nunca inventa una traducción).
- La ficha (`app/digimon/[name]/page.tsx`) muestra el nombre familiar como
  título principal, y el nombre canónico más chico al lado **solo si
  difieren** (`showCanonicalName`).

## Líneas curadas: Adventure, Adventure 02 y Tamers

Definidas a mano en `lib/digimon/animeEvolutionLines.ts` — cada
`digiApiName` fue verificado contra la API real (`GET /digimon/{name}`), no
adivinado. 15 líneas en total:

**Digimon Adventure** (8 protagonistas): Agumon, Gabumon, Piyomon
(→Biyomon), Tentomon, Palmon, Gomamon, Patamon, Tailmon (→Gatomon). Cada uno
con su línea completa Bebé → In-Training → Rookie → Champion → Ultimate →
Mega, tal como se ve en el anime.

**Digimon Adventure 02** (4 protagonistas): V-mon (→Veemon), Hawkmon,
Armadimon (→Armadillomon), Wormmon. Veemon y Wormmon comparten a Paildramon y
ambos modos de Imperialdramon (Dragon Mode / Fighter Mode) como etapas Mega
compartidas.

**Digimon Tamers** (3 protagonistas): Guilmon, Terriermon, Renamon.

### Alias notables dentro de estas líneas (nombre Digi-API → nombre familiar)

```
Piyomon → Biyomon        Mochimon → Motimon        Choromon → Pabumon
Tunomon → Tsunomon        Pitchmon → Pichimon        Pukamon → Bukamon
Plotmon → Salamon         Yukimi Botamon → Snow Botamon
Armadimon → Armadillomon  Chicomon → Chibomon        Chibimon → DemiVeemon
XV-mon → ExVeemon         Growmon → Growlmon         Megalo Growmon → WarGrowlmon
Dukemon → Gallantmon      Rapidmon Perfect → Rapidmon
Saint Galgomon → MegaGargomon           Pokomon → Viximon
Holy Angemon → MagnaAngemon
Atlur Kabuterimon (Red) → MegaKabuterimon
Herakle Kabuterimon → HerculesKabuterimon
Hououmon → Phoenixmon     Holydramon → Magnadramon
Tailmon → Gatomon         V-mon → Veemon
```

### Ejemplo: Holydramon → Magnadramon

Caso documentado en el propio código porque fue el más difícil de resolver:
la etapa Mega de Gatomon se llama "Magnadramon" en el doblaje, pero en
Digi-API es **"Holydramon"**. Una búsqueda directa de "Magnadramon" da 400
(no existe con ese nombre), y el buscador de Digi-API no hace matching por
substring, así que ni "Magna" ni "Dramon" la encuentran. Se confirmó leyendo
los propios `priorEvolutions`/`nextEvolutions` de Angewomon y Tailmon en la
API, que referencian "Holydramon" directamente — así se confirmó el vínculo
sin depender del nombre.

## Limitaciones de las evoluciones de la API

- `priorEvolutions`/`nextEvolutions` de Digi-API son un **grafo aplanado**
  across todos los juegos, cartas y apariciones en dispositivos — un
  Digimon de nivel Champion puede listar docenas de "next", la mayoría
  irrelevantes para quien solo conoce el anime. Por eso existen las líneas
  curadas: un camino chico, ordenado y verificado a mano por protagonista,
  en vez de intentar derivar el camino "correcto" del grafo crudo.
- El buscador de Digi-API **no** hace matching por substring — solo nombre
  exacto (o alias resuelto localmente).
- La lista (`GET /digimon`) es sensible a mayúsculas en el nombre del query
  param: `pageSize` (camelCase) funciona, `pagesize` es ignorado
  silenciosamente y Digi-API vuelve a su propio default (5).
- Pasado el total de páginas, `GET /digimon` responde **200** con `content`
  **ausente** (no `[]`) — hay que leer `pageable.nextPage === ""` para saber
  que no hay más, nunca asumir que `content` siempre existe.
- Las evoluciones crudas siguen mostrándose igual, más abajo en la ficha
  ("Otras evoluciones posibles"), como complemento — nunca se ocultan.

## Cómo agregar una nueva línea curada, o corregir una existente

Todo vive en `lib/digimon/animeEvolutionLines.ts`.

**Agregar una etapa a una línea existente o corregir un `digiApiName`:**

1. Verificar el nombre exacto contra la API real:
   `https://digi-api.com/api/v1/digimon/{nombre}` (probar con espacios
   literales o `%20`, Digi-API usa nombres con espacio para varias formas,
   p. ej. `Metal Greymon`).
2. Usar el helper `stage(digiApiName, familiarName?)` — si no se pasa
   `familiarName`, se asume igual a `digiApiName`.
3. Si el nombre familiar correcto ya se sabe distinto al de Digi-API,
   pasarlo como segundo argumento.

**Agregar una línea nueva para un protagonista ya cubierto por una serie
existente**: agregar un objeto a `ANIME_EVOLUTION_LINES` con `id` (slug
único), `series` (una de las tres existentes), `baseDigiApiName` (nombre
Digi-API del Rookie) y `stages` en orden Bebé → Mega.

**Agregar una serie nueva** (por ejemplo Frontier, Data Squad, etc.):

1. Sumar el valor al tipo `AnimeSeries`.
2. Sumar su label a `SERIES_LABELS`.
3. Agregar las líneas de esa serie a `ANIME_EVOLUTION_LINES` con el nuevo
   valor de `series`.
4. Si además se quiere una sección curada en el home, agregar una entrada a
   `CURATED_SERIES_SECTIONS` con `series`, `title` y `baseNames` (los
   nombres Digi-API de los Rookies protagonistas de esa serie).

No hace falta tocar `services/animeEvolutionLines.ts` ni los componentes de
UI — todos leen de estos datos genéricamente.
