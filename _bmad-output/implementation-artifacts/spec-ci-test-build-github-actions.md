---
title: 'Validar tests y build con GitHub Actions'
type: 'chore'
created: '2026-08-14'
status: 'done'
baseline_commit: '16d1fc1be81fca8933e882c67cae027429247a91'
context:
  - '{project-root}/docs/architecture.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El repositorio no tiene un workflow que detecte automáticamente pruebas o builds rotos antes de integrar cambios en `develop`, por lo que el despliegue automático carece de una compuerta verificable.

**Approach:** Agregar un workflow de GitHub Actions que use las versiones fijadas del proyecto, genere Prisma Client y ejecute `pnpm test` seguido de `pnpm build` en pull requests y pushes dirigidos a `develop`.

## Boundaries & Constraints

**Always:** Usar Node.js 20.19.0 y pnpm 10.34.5; instalar con `--frozen-lockfile`; ejecutar `prisma generate` antes de tests/build; usar permisos de solo lectura; fijar actions de terceros por SHA inmutable; utilizar exclusivamente valores ficticios y no sensibles para las variables requeridas durante el build; cancelar ejecuciones obsoletas de la misma referencia.

**Ask First:** Convertir lint, cobertura, E2E o pruebas de integración con PostgreSQL en compuertas; agregar secretos de GitHub; modificar reglas de protección de ramas; ejecutar despliegues desde el workflow.

**Never:** Ejecutar migraciones, seed o llamadas a servicios reales; incorporar credenciales de producción; ocultar fallos con `continue-on-error`; cambiar pruebas o código de negocio para hacer verde la automatización; depender de la rama predeterminada incorrecta para definir el disparador.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pull request | PR con base `develop` | Instala, genera Prisma, prueba y construye | Cualquier comando fallido deja el check rojo |
| Push directo | Push a `develop` | Ejecuta la misma validación post-integración | El fallo bloquea el despliegue que dependa del check |
| Nueva actualización | Segundo commit sobre la misma PR | Cancela la ejecución anterior y valida el commit nuevo | No consume runner en resultados obsoletos |
| PR desde fork | No dispone de secretos del repositorio | Funciona con variables ficticias declaradas en el job | No accede a entornos ni servicios externos |
| Lockfile inconsistente | `package.json` y lockfile divergen | La instalación falla antes de tests | No regenera ni modifica el lockfile en CI |

</frozen-after-approval>

## Code Map

- `.github/workflows/ci.yml` -- nueva compuerta de tests y build para `develop`.
- `package.json` -- fuente de pnpm 10.34.5 y comandos `test`/`build`.
- `pnpm-lock.yaml` -- entrada del caché y contrato de instalación reproducible.
- `prisma/schema.prisma` y `prisma.config.ts` -- requieren variables ficticias y generación previa del cliente.
- `README.md` -- documentación del check que debe exigirse antes de integrar.

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/ci.yml` -- crear el job `test-and-build` con triggers, concurrencia, permisos mínimos, caché pnpm y secuencia reproducible.
- [x] `README.md` -- documentar cuándo corre el workflow y qué check debe configurarse como obligatorio.

**Acceptance Criteria:**
- Given un PR cuya base es `develop`, when GitHub procesa el evento, then aparece un check que ejecuta Prisma Generate, 413+ pruebas y el build de Next.js.
- Given un fallo de instalación, generación, test o build, when termina el job, then el check falla sin continuar ni desplegar.
- Given el workflow versionado, when se inspeccionan sus actions, then todas usan SHAs inmutables y el job solo posee `contents: read`.
- Given un PR sin secretos, when corre CI, then usa valores ficticios y no intenta conectarse a PostgreSQL, ePayco, Sentry, Loggro, Cloudinary o Resend.

## Spec Change Log

- 2026-08-14: Revisión independiente confirmó aceptación y deshabilitó persistencia de credenciales Git durante checkout.

## Design Notes

El job es intencionalmente único y secuencial: evita instalar dependencias dos veces y presenta una sola compuerta estable para la protección de `develop`. La caché almacena el store de pnpm mediante `setup-node`; `node_modules` siempre se reconstruye desde el lockfile. No se incluye lint porque el comando actual contiene deuda previa ajena y Sebas solicitó específicamente tests y build.

## Verification

**Commands:**
- Validar sintaxis del workflow con un parser YAML y revisar expresiones de GitHub Actions.
- Ejecutar localmente con pnpm 10.34.5: `pnpm install --frozen-lockfile`, `pnpm exec prisma generate`, `pnpm test` y `pnpm build` usando las mismas variables ficticias.
- Tras publicar la rama, consultar la ejecución real con GitHub CLI y confirmar el check `CI / test-and-build`.

## Suggested Review Order

**Compuerta de integración**

- Triggers limitan la compuerta a PR y push sobre `develop`.
  [`ci.yml:3`](../../.github/workflows/ci.yml#L3)

- Permisos mínimos y concurrencia cancelan validaciones obsoletas sin capacidad de escritura.
  [`ci.yml:11`](../../.github/workflows/ci.yml#L11)

- Entorno usa únicamente valores ficticios y desactiva escrituras ERP.
  [`ci.yml:22`](../../.github/workflows/ci.yml#L22)

- Secuencia fija instala, genera Prisma, prueba y construye sin ocultar fallos.
  [`ci.yml:35`](../../.github/workflows/ci.yml#L35)

**Documentación**

- README explica el check obligatorio que debe proteger `develop`.
  [`README.md:284`](../../README.md#L284)
