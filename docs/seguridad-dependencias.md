# Seguridad de dependencias

> Estado al 16 de octubre de 2026 — `pnpm audit --prod`: **sin vulnerabilidades conocidas** (0 altas, 0 críticas, 0 moderadas, 0 bajas). Sin listas de CVE ignoradas (`auditConfig.ignoreCves` eliminado).

## Punto de partida y evolución

| Momento | Total prod | Altas | Moderadas | Bajas | Notas |
|---|---|---|---|---|---|
| Informe del 2 de septiembre de 2026 | 43 | 17 | — | — | Reporte inicial |
| Medición real al empezar | 54 | 25 | 25 | 4 | Auditoría base |
| Remediación del 3 de septiembre | 0 | 0 | 0 | 0 | Parches Next 16.2.12 y overrides iniciales |
| Revisión del 15 de octubre | 5 | 3 | 2 | 0 | Nuevos advisories en Next 16.2 y SheetJS |
| Remediación del 16 de octubre de 2026 | **0** | **0** | **0** | **0** | Next 16.4.2, SheetJS 0.20.3 CDN, Vitest 4.1.12 |

## Qué se actualizó directamente

| Paquete | De | A | Motivo |
|---|---|---|---|
| `next` | 16.2.12 | 16.4.2 | Parches a CVE-2026-94483 (SSRF en optimizador de imágenes), GHSA-2xp9-vwfh-vxw4 (AVIF RCE) y GHSA-vcvr-r3jv-pc5j (next/og RCE) |
| `@next/env` | 16.2.12 | 16.4.2 | Alineación con `next` |
| `eslint-config-next` | 16.2.12 | 16.4.2 | Alineación con `next` |
| `xlsx` | 0.18.5 | 0.20.3 | Reemplazo de paquete npm desatendido por distribución oficial CDN de SheetJS con integridad SHA-512 (CVE-2023-30533, CVE-2024-22363) |
| `vitest` | 4.1.10 | 4.1.12 | Corrección de GHSA-82fw-gwwq-j7x9 (Path traversal / Arbitrary File Read en @vitest/mocker) |
| `@vitest/coverage-v8` | 4.1.10 | 4.1.12 | Alineación con `vitest` |
| `sanitize-html` | ^2.17.5 | ^2.17.7 | Dependencia de runtime usada directamente por el código |

Cada actualización se verificó con `tsc`, `eslint`, la suite unitaria completa (144 suites / 1.211 tests) y auditoría de seguridad antes de integrarse.

## Overrides

Viven en `pnpm-workspace.yaml`, no en `package.json`: pnpm 10 dejó de leer el
campo `pnpm.overrides` del `package.json` y lo ignora en silencio salvo por un
aviso. No se utiliza `auditConfig.ignoreCves`; todas las vulnerabilidades de producción están remediadas por versión o override.

Cada override existe porque el paquete padre todavía **no** publica una versión
que incluya el parche. Se fijan por línea de major (`paquete@major`) donde
conviven varias, para no forzar a un consumidor a una API que no espera.

| Override | Llega por | Por qué no basta con actualizar el padre |
|---|---|---|
| `brace-expansion@1`, `brace-expansion@5` | `eslint`, `@typescript-eslint/parser`, `@sentry/nextjs` | Ambas líneas están instaladas a la vez; parches a GHSA-qhr7-859c-m2p7 y GHSA-6j4f-fj2g-mc7p en 1.1.21 y 5.0.12 |
| `browserslist` | `eslint-config-next` → `@babel/core` | El padre fija un rango anterior al parche |
| `deepmerge-ts` | `@prisma/config` | `@prisma/config` fija la versión exacta `7.1.5`; el parche solo existe en 8.x |
| `dompurify` | `@monaco-editor/react` → `monaco-editor` | Monaco empaqueta una versión anterior; parche a GHSA-p98j-92pf-mc4p en 3.4.16 |
| `fast-uri@3` | `@sentry/nextjs` → `webpack` → `ajv` | Cadena de cuatro niveles; parche a GHSA-hrr3-gc8f-f4qj en 3.1.8 |
| `js-yaml@4` | `eslint` → `@eslint/eslintrc` | El padre fija un rango anterior al parche |
| `nanoid@3` | `@tailwindcss/postcss` → `postcss` | El padre fija un rango anterior al parche |
| `postcss@8` | `next`, `@tailwindcss/postcss` | Dos rutas distintas con la misma línea vulnerable |
| `qs@6` | `epayco-sdk-node` → `superagent` | El SDK de ePayco no ha publicado la actualización |
| `sharp` | `next` (dependencia opcional) | Next declara `^0.34.5`, pero libvips solo queda parcheado en 0.35.x (0.35.5) |
| `axios` | `epayco-sdk-node` | Subdependencia desactualizada en el SDK de ePayco fijada a 1.20.0 |
| `source-map-js` | `postcss` | Corrección transitiva a 1.2.2 |
| `vitest` | `better-auth` (peer/runtime dependency) | Asegura que `better-auth` resuelva Vitest 4.1.12 parcheado ante GHSA-82fw-gwwq-j7x9 |

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
