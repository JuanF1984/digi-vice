# Decisiones técnicas

## Por qué pnpm

`package.json` fija `"packageManager": "pnpm@11.5.0"` y el README raíz declara
"Gestión de dependencias exclusivamente con pnpm". El código no deja un
comentario explícito comparando pnpm contra npm/yarn — se documenta acá como
**convención fijada del proyecto**: un único gestor de paquetes y un único
lockfile (`pnpm-lock.yaml`) evita instalaciones mixtas o lockfiles
divergentes entre colaboradores/CI. Si en algún momento se cambia de gestor,
hacerlo de forma explícita (actualizar `packageManager`, borrar el lockfile
viejo, documentar el cambio acá) en vez de dejar que conviva con pnpm.

## Por qué se mantiene el Translator API del navegador

`TranslatedDescription.tsx` usa `window.Translator` (Chrome, modelo
on-device) como la vía de traducción "en caliente": no requiere backend
propio, no requiere una API key de un servicio de traducción pago, y corre
enteramente en el navegador del usuario. El costo es que **hoy solo existe
en Chrome de escritorio** — de ahí la necesidad de un respaldo (siguiente
punto).

## Por qué Supabase funciona como respaldo para celular

El Translator API no está disponible en Chrome Android ni en Safari/otros
navegadores de celular. Sin un respaldo, cualquier visitante fuera de Chrome
de escritorio vería siempre inglés. La solución: cuando el Translator API sí
traduce algo (en un navegador que lo soporta) y hay una sesión válida, esa
traducción se guarda una sola vez en `digimon_translations`
(guardado automático, ver [SUPABASE.md](./SUPABASE.md)). A partir de ahí,
**cualquier** visitante — con o sin el Translator API, con o sin sesión —
puede leer esa traducción ya guardada server-side, antes de que la ficha se
renderice. La lectura es pública (RLS permite `SELECT` a `anon`) exactamente
para que esto funcione sin pedirle sesión a nadie.

## Por qué las líneas del anime son curadas a mano

El grafo de evoluciones que devuelve Digi-API
(`priorEvolutions`/`nextEvolutions`) es la unión de todas las formas de
evolucionar across juegos, cartas coleccionables y otros dispositivos — no
representa el camino que efectivamente se ve en el anime, y no hay forma de
derivarlo automáticamente del grafo crudo (no viene marcado "esto es del
anime"). La alternativa curada a mano (`lib/digimon/animeEvolutionLines.ts`)
es deliberadamente chica y verificada contra la API real digimon por
digimon, en vez de intentar heurísticas sobre el grafo completo.

## Por qué no se usa `service_role`

`service_role` de Supabase **bypassa RLS por completo** — cualquier código
que la use tiene acceso total a la tabla, sin las políticas de seguridad
como límite. Este proyecto depende de RLS como el único mecanismo real de
autorización de escritura (una única cuenta autorizada, vía `auth.uid()`).
Usar `service_role` en el servidor rompería esa garantía silenciosamente (un
bug en el código, no en RLS, pasaría a ser la única defensa). Por eso:
`service_role` no aparece en `.env.example` ni se referencia en ningún
archivo del código — todo el acceso a Supabase (lectura y escritura) pasa
por la publishable key + RLS.

## Por qué la escritura está restringida por RLS

El guardado de traducciones necesita un "editor" pero el proyecto no tiene
(ni quiere) un sistema de cuentas múltiples ni roles — es una única cuenta
autorizada. En vez de reinventar ese control de acceso en código de
aplicación (una lista de emails permitidos, por ejemplo), la decisión fue
delegarlo enteramente a Postgres: la policy de `INSERT`/`UPDATE` compara
`auth.uid()` contra esa cuenta. El Route Handler (`/api/translations`)
agrega una capa adicional de validación de payload y de sesión verificada,
pero **la autorización real** es la policy de RLS — así, aunque el Route
Handler tuviera un bug, RLS seguiría rechazando escrituras no autorizadas al
nivel de la base.

## Problemas importantes encontrados y su causa real

### Traducciones guardadas no visibles en celular (julio 2026)

**Síntoma**: una traducción confirmada en la tabla `digimon_translations`
(fila existente, hash correcto) no se mostraba en la ficha al abrirla desde
un celular — seguía en inglés.

**Diagnóstico realizado** (todo descartado como causa, verificado con datos
reales — Agumon y Gabumon, no hipotético):

- Texto fuente: `pickDescription` es determinista, no depende de headers de
  request ni de locale del visitante — correcto.
- Hash: recalculado sobre la descripción real de Digi-API, coincide byte a
  byte con el `source_hash` almacenado — correcto.
- Consulta a Supabase: repetida con la query exacta de
  `getSavedTranslation` contra la REST API — devuelve la fila.
- RLS: lectura anónima (solo publishable key, sin sesión) confirmada en
  vivo — permite `SELECT` a `anon` correctamente.
- Server Component → Client Component: reproducido localmente con las
  credenciales reales de producción, request sin ninguna cookie (equivalente
  a celular sin sesión) — el HTML servido por el servidor ya traía el texto
  en español en el `<p>` visible, sin depender de JS del cliente.

**Causa real**: una variable de entorno (`NEXT_PUBLIC_SUPABASE_URL` o
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) sin valor efectivo cargado en el
ambiente de **Production** de Vercel — no un bug de lógica, hash, RLS ni
estado de cliente. Ver la advertencia correspondiente en
[SUPABASE.md](./SUPABASE.md) y el detalle de síntomas en
[TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Por qué costó encontrarlo**: `getSavedTranslation` atrapa *cualquier*
error (de configuración, de red, o de Supabase) y devuelve `null` — el mismo
valor que "no hay traducción guardada". Esto evita que un problema de
configuración rompa la ficha pública, pero también hace que el síntoma en el
navegador sea indistinguible de "la traducción no existe", sin mirar los
logs del servidor. Las traducciones ya guardadas no necesitaron
regenerarse — el dato y el hash siempre fueron correctos.

### Regresión conocida: acceso dinámico a `process.env.NEXT_PUBLIC_*`

Documentada preventivamente en el comentario de `lib/supabase/env.ts`: si el
nombre de una env var `NEXT_PUBLIC_*` se arma dinámicamente
(`process.env[name]` en vez de `process.env.NEXT_PUBLIC_SUPABASE_URL`
escrito literal), el compilador de Next.js no puede inlinearla en el bundle
del navegador — el server sigue funcionando (Node sí lee `process.env` en
tiempo real), pero el navegador recibe `undefined`. Por eso
`getSupabaseEnv()` siempre accede a los nombres como member expression
literal, no dinámica.
