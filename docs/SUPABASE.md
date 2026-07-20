# Supabase

## Variables de entorno necesarias

Definidas y validadas en `lib/supabase/env.ts` (`getSupabaseEnv()`), leídas
tal cual por `lib/supabase/client.ts`, `lib/supabase/server.ts` y
`lib/supabase/proxy.ts`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxx
```

- Ambas son `NEXT_PUBLIC_*` a propósito: la publishable key está pensada para
  usarse desde el navegador (rol `anon`), no es un secreto que haya que
  ocultar del cliente.
- La app **nunca** usa una `service_role` key — no existe en `.env.example`
  ni se referencia en ningún archivo del código. Ver
  [DECISIONS.md](./DECISIONS.md).
- Si falta cualquiera de las dos, `getSupabaseEnv()` lanza un error
  descriptivo (`Falta la variable de entorno ...`). Ese error se propaga
  distinto según quién llame:
  - `proxy.ts` lo atrapa y sigue de largo (el catálogo público no depende de
    Supabase).
  - `services/translations.ts:getSavedTranslation` lo atrapa también (nunca
    rompe la ficha) — pero esto significa que un error de configuración se
    ve **igual** que "no hay traducción guardada". Ver
    [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
  - `/admin` y `/api/translations` sí dependen de que esté bien configurado
    para funcionar (login y guardado).

⚠️ **Un `NEXT_PUBLIC_*` en Next.js igual necesita estar disponible en
tiempo de ejecución del servidor** (no es solo para el navegador): si en
Vercel la variable existe con el nombre correcto pero **sin valor
efectivo** (o apunta a un proyecto Supabase distinto al de las traducciones
guardadas), el síntoma es exactamente "la traducción existe en la base pero
la ficha no la muestra" — sin ningún error visible para quien navega. **Ya
pasó** (ver [DECISIONS.md](./DECISIONS.md), incidente de julio 2026): la
causa real fue una variable de entorno de Production sin valor cargado.

### Vercel: Production vs Preview, y el redeploy

- Las env vars de Vercel se configuran **por ambiente** (Production /
  Preview / Development). Que estén bien en un ambiente no garantiza que
  estén bien en otro.
- Cambiar el valor de una env var en el dashboard de Vercel **no afecta**
  deploys ya existentes — hace falta un **redeploy** para que el nuevo valor
  se use en producción. Si corregís una variable y no ves el cambio, primero
  confirmá que hiciste un redeploy después del cambio.
- Para inspeccionar/sincronizar variables desde la terminal, instalar el
  Vercel CLI (`npm i -g vercel`) habilita `vercel env ls`, `vercel env pull`,
  `vercel logs`.

## Tabla `digimon_translations`

Esquema confirmado por el código que la usa (`app/api/translations/route.ts`
para escritura, `services/translations.ts` para lectura) y por filas reales
observadas vía REST. Columnas usadas por la aplicación:

| Columna | Tipo (uso observado) | Notas |
|---|---|---|
| `digimon_id` | number (entero positivo) | ID de Digi-API (`raw.id`). |
| `digimon_name` | string | Nombre canónico de Digi-API, solo informativo (no se usa para el lookup). |
| `source_language` | string | Siempre `"en"` en el guardado actual. |
| `target_language` | string | Siempre `"es"` en el guardado y lectura actuales. |
| `source_text` | string | Texto en inglés normalizado que se tradujo (para poder auditar/regenerar). |
| `source_hash` | string (hex, SHA-256) | Ver `lib/supabase/hash.ts`. Clave del lookup. |
| `translated_text` | string | Traducción en español. Es lo único que lee la ficha. |
| `translation_source` | string | Siempre `"chrome-translator"` en el guardado actual. |
| `review_status` | `"automatic" \| "reviewed" \| "corrected"` | Ver prioridad más abajo. Hoy la app solo **escribe** `"automatic"` — no hay UI para marcar `"reviewed"`/`"corrected"` (ver [NEXT_STEPS.md](./NEXT_STEPS.md)). |
| `created_by` | UUID | `user.id` de Supabase Auth (la única cuenta autorizada). |
| `created_at` | timestamp | Con default de la base (no lo setea la app). |

Puede haber columnas adicionales (por ejemplo una PK propia) no referenciadas
directamente por el código — para el esquema completo, revisar el **Table
Editor** de Supabase.

### Restricción única

`onConflict: "digimon_id,source_hash,target_language"` en el `upsert` de
`app/api/translations/route.ts` — implica una restricción `UNIQUE` sobre
esas tres columnas. Garantiza como máximo una fila por combinación de
Digimon + texto fuente exacto + idioma destino.

### Políticas RLS

Comportamiento confirmado (no se relevó el SQL exacto de las políticas —
revisar en el dashboard de Supabase, **Authentication → Policies**, sobre
`digimon_translations`, si hace falta modificarlas):

- **`SELECT` pública** (rol `anon`, sin sesión): confirmado en vivo haciendo
  un `select` directo a la REST API con solo la publishable key. Necesaria
  para que cualquier visitante (incluido un celular sin login) pueda leer
  traducciones ya guardadas.
- **`INSERT`/`UPDATE` restringida**: el Route Handler devuelve 403 cuando
  Postgres rechaza el `upsert` con `code === "42501"`. Según el comentario en
  el código, la policy de escritura compara `auth.uid()` contra la única
  cuenta autorizada — no cualquier usuario logueado puede escribir, solo esa
  cuenta específica.

## Flujo de lectura

```
app/digimon/[name]/page.tsx (Server Component)
  → services/translations.ts:getSavedTranslation(digimonId, sourceText)
      1. sourceHash = computeSourceHash(sourceText)   // lib/supabase/hash.ts
      2. supabase.from("digimon_translations")
           .select("translated_text, review_status")
           .eq("digimon_id", digimonId)
           .eq("source_hash", sourceHash)
           .eq("target_language", "es")
      3. sin filas → null
         error de Supabase → console.error + null
         una o más filas → la de mayor prioridad (corrected > reviewed > automatic)
```

`computeSourceHash` (`lib/supabase/hash.ts`) es SHA-256 hex sobre
`text.replace(/\s+/g, " ").trim()`, codificado UTF-8, calculado **siempre en
el servidor** (`crypto` de Node) — nunca en el navegador. Es la misma función
que usa el guardado, así que ambos flujos no pueden divergir en el
algoritmo. Ver el flujo de guardado abajo y el detalle en
[ARCHITECTURE.md](./ARCHITECTURE.md#lectura-de-traducciones-desde-supabase).

## Flujo de guardado

```
TranslatedDescription.tsx (Client, tras traducir con el Translator API)
  → lib/digimon/saveTranslation.ts:saveTranslation(...)   // fire-and-forget, deduplicado en memoria
      → POST /api/translations { digimonId, digimonName, sourceText, translatedText }

app/api/translations/route.ts
  1. valida el payload (independiente de lo que declara el cliente)
  2. supabase.auth.getUser()  → 401 si no hay sesión verificada
  3. sourceHash = computeSourceHash(sourceText)   // recalculado, no confía en el cliente
  4. si ya existe una fila reviewed/corrected → skip (no la pisa)
  5. upsert(..., { onConflict: "digimon_id,source_hash,target_language" })
     → RLS decide si el insert/update procede de verdad
```

## Cómo verificar logs

- **Vercel**: `vercel logs` (requiere `vercel` CLI instalado y el proyecto
  linkeado — `npm i -g vercel`, después `vercel link`) o desde el dashboard,
  **Deployments → [deployment] → Functions**. Buscar por los prefijos de
  `console.error` que usa el código, por ejemplo:
  - `[digidesk] error al consultar traducción guardada`
  - `[digidesk] fallo inesperado al leer traducciones guardadas`
  - `[digidesk] error al consultar traducción existente`
  - `[digidesk] error al guardar traducción`
  - `Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL` (o
    `..._PUBLISHABLE_KEY`)
- **Supabase**: dashboard del proyecto → **Logs** (API logs / Postgres logs)
  para ver los `select`/`upsert` reales llegando, y **Table Editor** para
  confirmar el contenido exacto de una fila.

## Cómo probar desde celular (o cualquier cliente sin sesión)

Para confirmar que una fila específica es legible de forma pública, sin
depender del celular real ni de ninguna sesión, se puede repetir la consulta
exacta que hace `getSavedTranslation` contra la REST API de Supabase:

```bash
curl "https://<tu-proyecto>.supabase.co/rest/v1/digimon_translations?select=translated_text,review_status&digimon_id=eq.<ID>&source_hash=eq.<HASH>&target_language=eq.es" \
  -H "apikey: <PUBLISHABLE_KEY>" \
  -H "Authorization: Bearer <PUBLISHABLE_KEY>"
```

- Si devuelve la fila esperada: la lectura pública funciona y el problema no
  está en RLS ni en el hash.
- Si devuelve `[]` con status 200: o no existe esa fila con ese hash exacto,
  o RLS la está filtrando (RLS no distingue esos dos casos vía HTTP: ambos
  dan un array vacío, nunca un error).
- Antes de sospechar de RLS o del hash, confirmar que el hash calculado
  coincide con el `source_hash` almacenado (recalculando con
  `computeSourceHash` sobre la descripción actual de Digi-API para ese
  Digimon) — un hash distinto explica un array vacío sin que haya ningún
  problema de permisos.

En Windows con Git Bash, si `curl` falla con
`schannel: ... CRYPT_E_NO_REVOCATION_CHECK`, agregar `--ssl-no-revoke` (es un
problema de verificación de revocación de certificados de Schannel, no de
Supabase).
