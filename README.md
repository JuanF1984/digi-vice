# DigiDesk

Un escáner de Digimon con identidad de Digivice: chasis claro tipo dispositivo portátil, pantalla LCD oscura embebida y datos leídos en vivo desde [Digi-API](https://digi-api.com/).

Next.js (App Router) + TypeScript + Tailwind CSS. Gestión de dependencias exclusivamente con **pnpm**.

## Requisitos

- Node.js 20+
- pnpm 11+ (`corepack enable` o `npm i -g pnpm` una única vez por máquina)

## Empezar

```bash
pnpm install
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev      # servidor de desarrollo (Turbopack)
pnpm build    # build de producción
pnpm start    # sirve el build de producción
pnpm lint     # ESLint
```

## Arquitectura

- `app/` — rutas (App Router): inicio, ficha `digimon/[name]`, estados de carga/error
- `components/ui/` — primitivos del chasis (header, pantalla, chips, LEDs)
- `components/digimon/` — tarjetas, grilla, buscador, estados, panel de descripción, lectura en voz, evoluciones
- `lib/digimon/` — acceso a Digi-API, normalización de datos, alias de nombres, formato
- `services/digimon.ts` — capa única que consumen las páginas
- `types/digimon.ts` — tipos basados en las respuestas reales de Digi-API

## Datos

Toda la información viene de [Digi-API](https://digi-api.com/api/v1) en tiempo real — no hay datos hardcodeados ni base de datos propia.

## Documentación interna

Para retomar el proyecto sin reconstruir todo el contexto, ver `docs/`:

- [docs/README.md](./docs/README.md) — resumen, stack, cómo correr y buildear, estructura, flujo de datos.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — arquitectura de Next.js, Server/Client Components, servicios, traducción, auth, RLS, voz.
- [docs/SUPABASE.md](./docs/SUPABASE.md) — variables de entorno, tabla `digimon_translations`, RLS, cómo depurar.
- [docs/DIGIMON_DATA.md](./docs/DIGIMON_DATA.md) — Digi-API, alias de nombres, líneas curadas del anime, limitaciones.
- [docs/DECISIONS.md](./docs/DECISIONS.md) — decisiones técnicas y por qué se tomaron.
- [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) — síntomas conocidos y su causa real.
- [docs/NEXT_STEPS.md](./docs/NEXT_STEPS.md) — mejoras pendientes e ideas futuras.
