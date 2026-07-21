# DigiDesk — Documentación interna

Este directorio documenta el estado real del proyecto para poder retomarlo sin
tener que reconstruir el contexto leyendo todo el código de nuevo. Refleja el
código tal como está hoy — si algo cambia, actualizá el documento
correspondiente en el mismo commit que cambia el código.

## Índice

- [ARCHITECTURE.md](./ARCHITECTURE.md) — arquitectura de Next.js, Server/Client Components, servicios, flujos de traducción, auth, voz.
- [SUPABASE.md](./SUPABASE.md) — variables de entorno, tabla `digimon_translations`, RLS, cómo depurar.
- [DIGIMON_DATA.md](./DIGIMON_DATA.md) — Digi-API, alias de nombres, líneas curadas del anime, limitaciones.
- [DECISIONS.md](./DECISIONS.md) — decisiones técnicas y por qué se tomaron.
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) — síntomas conocidos y su causa real.
- [NEXT_STEPS.md](./NEXT_STEPS.md) — mejoras pendientes e ideas futuras.
- [CYD_ENDPOINTS.md](./CYD_ENDPOINTS.md) — endpoints `?display=tft` e `/image` agregados para el firmware de la CYD (Etapa A, servidor únicamente).

## Resumen general

DigiDesk es un "escáner de Digimon" con estética de Digivice (chasis claro,
pantalla LCD oscura embebida) que consulta datos en vivo desde
[Digi-API](https://digi-api.com/api/v1). No hay base de datos propia de
Digimon: todo el catálogo, imágenes, niveles, tipos, atributos, descripciones
y evoluciones vienen de Digi-API en tiempo real.

Sí existe una base de datos propia (Supabase) pero con un único propósito:
guardar traducciones al español de las descripciones en inglés que entrega
Digi-API, para que un visitante que no tiene el Translator API del navegador
(por ejemplo, cualquiera en un celular) igual pueda ver la ficha en español.

## Objetivo de DigiDesk

- Buscar un Digimon por nombre y ver su ficha (imagen, niveles, tipos,
  atributos, campos, descripción, evoluciones).
- Navegar el catálogo completo con scroll infinito, con secciones curadas al
  principio para los protagonistas de Adventure, Adventure 02 y Tamers.
- Mostrar la descripción del Digimon en español siempre que sea posible:
  primero una traducción ya guardada en Supabase: si no existe, con el
  Translator API del navegador (solo Chrome de escritorio); si ninguna está
  disponible, en inglés (o japonés, en los pocos casos donde Digi-API no
  tiene versión en inglés).
- Mostrar, para los protagonistas de esas tres series, la línea evolutiva tal
  como aparece en el anime (curada a mano), además de las evoluciones crudas
  que reporta Digi-API.
- Leer la ficha en voz alta con `speechSynthesis` del navegador.

## Stack

- **Next.js 16.2.10** (App Router, Turbopack) — ver `AGENTS.md` en la raíz:
  esta versión renombró la convención de middleware a **Proxy**
  (`proxy.ts` en la raíz, no `middleware.ts`).
- **React 19** + **TypeScript** (`strict: true`).
- **Tailwind CSS v4** (`@tailwindcss/postcss`).
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) — solo para
  autenticación del panel `/admin` y la tabla `digimon_translations`.
- **pnpm** (`packageManager: pnpm@11.5.0`) — único gestor de paquetes del
  proyecto (ver [DECISIONS.md](./DECISIONS.md)).
- Sin ORM: las consultas a Supabase usan el cliente JS directamente
  (`@supabase/ssr`), sin capa de acceso a datos adicional.
- Fuente de datos de Digimon: [Digi-API](https://digi-api.com/api/v1), pública,
  sin API key.

## Cómo ejecutar localmente

```bash
pnpm install
cp .env.example .env.local   # completar con los valores de tu proyecto Supabase
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Variables necesarias en `.env.local` (ver [SUPABASE.md](./SUPABASE.md) para el
detalle completo):

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

Si estas variables faltan, el catálogo y las fichas de Digimon siguen
funcionando (en inglés/Translator API): solo `/admin` y el guardado de
traducciones dependen de ellas. Ver `lib/supabase/proxy.ts` y
`lib/supabase/env.ts`.

## Cómo hacer build

```bash
pnpm build    # build de producción
pnpm start    # sirve el build de producción localmente
pnpm lint     # ESLint (eslint-config-next)
```

## Estructura principal de carpetas

```
app/
  page.tsx                    Home: catálogo + secciones curadas
  digimon/[name]/page.tsx     Ficha de un Digimon (Server Component)
  digimon/[name]/loading.tsx  Estado de carga de la ficha
  admin/page.tsx              Panel de login/logout (Supabase Auth)
  admin/LoginForm.tsx          Client Component: formulario de login
  admin/LogoutButton.tsx       Client Component: botón de logout
  api/digimon/route.ts        Backend del scroll infinito (GET)
  api/translations/route.ts   Guardado de traducciones (POST)
  layout.tsx, error.tsx, not-found.tsx, loading.tsx, globals.css

components/
  ui/          Primitivos de chasis (header, pantalla, chips, LED)
  digimon/     Tarjetas, grilla, buscador, panel de descripción,
               traducción, voz, líneas de evolución (anime y crudas)

lib/
  digimon/     Acceso a Digi-API, normalización, alias, formato,
               caché de catálogo y de traducciones (sessionStorage)
  supabase/    Clientes Supabase (server/browser), env vars, hash,
               sesión "optimista", proxy.ts (auth cookies)

services/
  digimon.ts             Capa única que consumen las páginas para Digi-API
  translations.ts         Lectura de traducciones guardadas (Supabase)
  animeEvolutionLines.ts   Resuelve las líneas curadas contra Digi-API

types/
  digimon.ts       Tipos basados en las respuestas reales de Digi-API
  translator.d.ts  Declaraciones ambientales del Translator API del navegador

proxy.ts   Proxy de Next.js 16 en la raíz (renombre de middleware.ts)
```

## Flujo general de datos

**Catálogo y fichas (siempre disponible, sin Supabase):**

```
Digi-API (digi-api.com/api/v1)
  → lib/digimon/api.ts (fetch + manejo de 400/404/errores)
  → lib/digimon/normalize.ts (normalizeDigimon, pickDescription)
  → services/digimon.ts (getDigimon, getDigimonPage, getCuratedHomeSections)
  → Server Components (app/page.tsx, app/digimon/[name]/page.tsx)
  → Client Components de presentación
```

**Traducción de la descripción (ficha de un Digimon):**

```
Server Component (app/digimon/[name]/page.tsx)
  → digimon.description.text (elegido de forma determinista por pickDescription)
  → services/translations.ts:getSavedTranslation(digimonId, sourceText)
      → lib/supabase/hash.ts:computeSourceHash(sourceText)
      → Supabase: select en digimon_translations (lectura pública, RLS anon)
  → DescriptionPanel (Server) → TranslatedDescription (Client)
      → si savedText existe: se muestra directo, sin Translator API
      → si no existe: intenta Translator API del navegador (solo Chrome desktop)
      → si tampoco está disponible: muestra el texto original (inglés/japonés)
      → si se tradujo con Translator API y hay sesión: fire-and-forget POST a
        /api/translations para guardarla (guardado automático)
```

Ver el detalle completo de cada paso en [ARCHITECTURE.md](./ARCHITECTURE.md).
