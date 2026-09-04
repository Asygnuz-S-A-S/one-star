# Seguridad de dependencias

> Estado al 3 de septiembre de 2026 — `pnpm audit`: **sin vulnerabilidades conocidas**.
> Punto 6 del informe de bloqueos del 2 de septiembre de 2026.

## Punto de partida

| Momento | Total | Altas | Moderadas | Bajas |
|---|---|---|---|---|
| Informe del 2 de septiembre | 43 | 17 | — | — |
| Medición real al empezar | 54 | 25 | 25 | 4 |
| Después de esta remediación | **0** | **0** | **0** | **0** |

El informe se quedó corto: entre su redacción y la medición aparecieron ocho
vulnerabilidades altas más.

## Qué se actualizó directamente

| Paquete | De | A | Motivo |
|---|---|---|---|
| `next` | 16.2.6 | 16.2.12 | Advisories de alta y moderada en el propio framework |
| `@next/env` | 16.2.6 | 16.2.12 | Alineación con `next` |
| `eslint-config-next` | 16.2.6 | 16.2.12 | Alineación con `next` |
| `sanitize-html` | ^2.17.5 | ^2.17.7 | Dependencia de runtime usada directamente por el código |

Cada actualización se verificó con `tsc`, `eslint`, la suite unitaria completa y
`next build` antes de pasar a la siguiente.

## Overrides

Viven en `pnpm-workspace.yaml`, no en `package.json`: pnpm 10 dejó de leer el
campo `pnpm.overrides` del `package.json` y lo ignora en silencio salvo por un
aviso.

Cada override existe porque el paquete padre todavía **no** publica una versión
que incluya el parche. Se fijan por línea de major (`paquete@major`) donde
conviven varias, para no forzar a un consumidor a una API que no espera.

| Override | Llega por | Por qué no basta con actualizar el padre |
|---|---|---|
| `brace-expansion@1`, `brace-expansion@5` | `eslint`, `@typescript-eslint/parser` | Ambas líneas están instaladas a la vez; cada una tiene su propio parche |
| `browserslist` | `eslint-config-next` → `@babel/core` | El padre fija un rango anterior al parche |
| `deepmerge-ts` | `@prisma/config` | `@prisma/config` fija la versión exacta `7.1.5`; el parche solo existe en 8.x |
| `dompurify` | `@monaco-editor/react` → `monaco-editor` | `monaco-editor` empaqueta una versión anterior |
| `fast-uri@3` | `@sentry/nextjs` → `webpack` → `ajv` | Cadena de cuatro niveles; ningún eslabón publica el parche |
| `js-yaml@4` | `eslint` → `@eslint/eslintrc` | El padre fija un rango anterior al parche |
| `nanoid@3` | `@tailwindcss/postcss` → `postcss` | El padre fija un rango anterior al parche |
| `postcss@8` | `next`, `@tailwindcss/postcss` | Dos rutas distintas con la misma línea vulnerable |
| `qs@6` | `epayco-sdk-node` → `superagent` | El SDK de ePayco no ha publicado la actualización |
| `sharp` | `next` (dependencia opcional) | Next declara `^0.34.5`, pero libvips solo queda parcheado en 0.35.x |

### Los dos overrides que merecen vigilancia

- **`sharp` 0.34 → 0.35.** Contradice el rango que declara Next
  (`optionalDependencies.sharp: ^0.34.5`), así que es el único que puede romperse
  con una actualización de Next. Se mantiene porque las CVE son de libvips
  (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591) y solo están
  corregidas en 0.35.x. La API que consume el optimizador de imágenes de Next no
  cambió entre ambas líneas; se verificó con `next build` y con la suite E2E.
  **Al subir de versión de Next, comprobar si ya declara `^0.35` y retirar este
  override.**
- **`deepmerge-ts` 7 → 8.** Sobrescribe una versión fijada de forma exacta por
  `@prisma/config`. Se verificó que `prisma generate` sigue cargando
  `prisma.config.ts` correctamente. Solo se usa en tiempo de build y nunca con
  datos de terceros.

## Cómo revisar esto en el futuro

```bash
pnpm audit
```

Al retirar un override, borrar su línea de `pnpm-workspace.yaml`, correr
`pnpm install` y `pnpm audit` para confirmar que el padre ya trae el parche.
