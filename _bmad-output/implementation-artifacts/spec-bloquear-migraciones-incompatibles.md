---
title: 'Bloquear migraciones incompatibles antes del despliegue'
type: 'chore'
created: '2026-08-24'
status: 'done'
baseline_commit: '69b285efe5574cb1f8ab8558c97bb958adcb3bff'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/deploy-vercel.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `prisma migrate deploy` corre antes de reemplazar el contenedor, por lo que una migración destructiva puede eliminar o renombrar objetos que el contenedor anterior todavía usa. La prueba actual confirma que el SQL aplica en una base vacía, pero no que sea compatible con ambas versiones de la aplicación durante el relevo.

**Approach:** Adoptar expand/contract como regla operativa y agregar un gate de CI que inspeccione únicamente las migraciones cambiadas. El gate rechazará migraciones históricas modificadas y DDL destructivo nuevo, salvo una contracción explícita que referencie un commit de preparación y un manifiesto específico e inmutable ya presentes en la rama base.

## Boundaries & Constraints

**Always:** Tratar las migraciones aplicadas como inmutables y forward-only; agregar columnas nuevas como nullable o con default compatible; separar expand, backfill/cambio de aplicación y contract en despliegues distintos; comparar contra el SHA base real del evento; ignorar comentarios y literales SQL al detectar operaciones; exigir que el commit de preparación agregue o actualice un manifiesto con identificador único, objetivos canónicos exactamente iguales a los derivados del DDL y checklist de compatibilidad, que ese contenido permanezca idéntico en la rama base y que el identificador se consuma una sola vez; documentar que el operador debe confirmar que el commit referenciado ya fue desplegado antes de ejecutar una contracción.

**Ask First:** Cambiar la lista de operaciones consideradas destructivas; aceptar una contracción sin commit y manifiesto previos verificables; agregar una migración o cambiar `schema.prisma`; alterar el orden migrate→deploy o la topología Docker/Vercel.

**Never:** Editar o borrar migraciones existentes; ejecutar una contracción en el mismo despliegue que retira el uso de la columna/tabla; usar `db push` o `migrate dev` en producción; escanear y reprobar migraciones históricas no cambiadas; modificar `docker-compose.prod.yml`; permitir un bypass silencioso del check.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Sin cambios Prisma | El diff no contiene `migration.sql` | Gate aprobado | Informa que no hay migraciones por revisar |
| Expansión compatible | Migración nueva agrega columna nullable/default o tabla | Gate aprobado | Lista los archivos inspeccionados |
| Migración histórica alterada | Archivo existente modificado, renombrado o borrado | Gate rechazado | Explica que debe crearse una migración forward-only nueva |
| DDL destructivo temprano | Migración nueva contiene drop, rename, truncate o cambio restrictivo | Gate rechazado | Enumera archivo y operación detectada |
| Contracción preparada | DDL destructivo declara commit e ID no consumido; el commit es ancestro de la base, contiene el manifiesto correspondiente con objetivos exactos y este no cambió después | Gate aprobado con aviso de contracción | Recuerda confirmar despliegue previo antes de migrar |
| Evidencia inválida | Commit ausente/futuro, ID duplicado/consumido, manifiesto inexistente, inválido, ajeno al commit, con objetos distintos al DDL o modificado después | Gate rechazado | No permite continuar con evidencia genérica, reutilizada o mutable |

</frozen-after-approval>

## Code Map

- `scripts/check-migration-safety.ts` -- CLI sin acceso a red que obtiene el diff Git y aplica las reglas expand/contract.
- `scripts/check-migration-safety.test.ts` -- pruebas de detección SQL, comentarios, estados Git y referencia de contracción.
- `prisma/migration-contracts/README.md` -- contrato del manifiesto que debe acompañar la fase de preparación.
- `package.json` -- expone un comando local reproducible para el gate.
- `.github/workflows/ci.yml` -- obtiene historia completa y pasa el SHA base del PR/push al verificador.
- `docs/architecture.md` -- declara expand/contract como invariante de arquitectura de despliegue.
- `docs/deploy-vercel.md` -- explica las tres fases y el procedimiento de contracción.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/check-migration-safety.ts` -- detectar migraciones agregadas/modificadas/eliminadas y DDL incompatible, validando commit y manifiesto previos de toda contracción.
- [x] `scripts/check-migration-safety.test.ts` -- cubrir cada escenario de la matriz con repositorios Git temporales, SQL representativo y evidencia mutable/incompleta.
- [x] `prisma/migration-contracts/README.md` -- definir formato, checklist y secuencia para crear evidencia de preparación auditable.
- [x] `package.json` y `.github/workflows/ci.yml` -- ejecutar el gate con el SHA base exacto antes de tests/build y sin debilitar los jobs obligatorios.
- [x] `docs/architecture.md` y `docs/deploy-vercel.md` -- documentar expand→migrate→contract, manifiesto auditable y confirmación manual del despliegue previo.
- [x] Step-04 PATCH -- rechazar SQL procedural no verificable y corregir el tratamiento de literales SQL.
- [x] Step-04 PATCH -- probar inmutabilidad prep/base/HEAD, historia sin cambios intermedios y commits de preparación merge.
- [x] Step-04 PATCH -- endurecer columnas required sin ampliar el catálogo DDL ni incluir DML.
- [x] Step-04 PATCH -- cerrar semántica de primer padre, historia base→HEAD y estado final de defaults/identity.

**Acceptance Criteria:**
- Given un PR sin migraciones nuevas, when corre el gate con el SHA base, then finaliza correctamente sin revisar el historial completo.
- Given una migración destructiva sin preparación previa, when corre CI, then `test-and-build` falla con el archivo y la operación incompatibles.
- Given una contracción que referencia un commit ya integrado y su manifiesto inmutable, when corre CI, then el gate la admite y muestra la advertencia operativa.
- Given el diff final, when se compara con el baseline del PR #8, then `docker-compose.prod.yml`, `schema.prisma` y las 14 migraciones existentes permanecen intactos.

## Spec Change Log

- 2026-08-24: La revisión adversarial demostró que cualquier SHA ancestro podía autorizar una contracción sin preparación real. Andrés autorizó exigir un manifiesto específico creado por el commit de preparación e idéntico en la rama base; se evita usar un commit antiguo no relacionado como bypass.
- 2026-08-24: Andrés confirmó que “evidencia específica” también exige objetivos canónicos exactamente ligados al DDL y un ID de un solo uso. Se evita reutilizar un manifiesto válido para otro objeto o para contracciones posteriores.
- 2026-08-24: Step-04 clasificó como PATCH los bypasses restantes. Se endurecieron ambos lexers, SQL procedural top-level, columnas required y la evidencia prep/base/HEAD con historia inmutable y soporte de merges, sin ampliar el catálogo DDL ni incluir DML.
- 2026-08-24: La revisión focal exigió primer padre para merges, historia inmutable también en base→HEAD, `DEFAULT` contextual y estado final de columnas agregadas. Se añadieron regresiones exactas sin cambiar el catálogo pactado.

## Design Notes

La excepción de contracción usa dos comentarios explícitos dentro de la migración nueva: `-- onestar:contract-after <sha>` y `-- onestar:contract-id <id>`. El gate confirma que `<sha>` es ancestro de la base, que ese commit creó o actualizó `prisma/migration-contracts/<id>.json`, que el manifiesto declara los objetivos canónicos exactos y todas las comprobaciones de compatibilidad, que su contenido sigue idéntico en la base y que el ID no aparece en otra migración nueva ni en marcadores históricos de la base. La confirmación de que esa versión llegó a producción permanece como paso humano antes de `migrate deploy`.

El detector se limita a operaciones con riesgo directo para la versión anterior: `DROP TABLE/COLUMN/TYPE/CONSTRAINT`, `RENAME TABLE/COLUMN`, `TRUNCATE`, cambios de tipo y `SET NOT NULL`. Los comentarios SQL se eliminan antes del análisis para evitar falsos positivos en notas de rollback.

`DO` y `CALL` top-level fallan por no ser verificables estáticamente, no por ampliar el catálogo. Los literales estándar cierran en `'` aunque estén precedidos por backslash; sólo `E'...'` usa escapes de backslash. Una columna nueva required incluye `NOT NULL`, `PRIMARY KEY` inline o PK de tabla; requiere un default no nulo propio o generación `SERIAL`/`IDENTITY`. `ON DELETE SET DEFAULT` no cuenta, y `SET DEFAULT NULL`, `DROP DEFAULT` o `DROP IDENTITY` posteriores vuelven insegura la columna. El manifiesto debe conservar bytes idénticos en preparación, base y `HEAD`, sin commits intermedios en preparación→base ni base→HEAD; un merge sólo prepara cuando cambia el manifiesto contra su primer padre.

## Verification

**Commands:**
- `pnpm test -- scripts/check-migration-safety.test.ts` -- expected: todos los escenarios del gate pasan.
- `pnpm db:migrations:check --base 69b285efe5574cb1f8ab8558c97bb958adcb3bff` -- expected: aprobado sin migraciones nuevas.
- `pnpm lint && pnpm test && pnpm exec tsc --noEmit` -- expected: calidad completa sin errores.
- `git diff --exit-code 69b285efe5574cb1f8ab8558c97bb958adcb3bff -- docker-compose.prod.yml prisma/schema.prisma prisma/migrations` -- expected: ningún cambio en topología, schema ni migraciones existentes.

## Suggested Review Order

**Gate y evidencia específica**

- Orquesta diff exacto, IDs de un uso, manifiesto inmutable y objetivos del DDL.
  [`check-migration-safety.ts:841`](../../scripts/check-migration-safety.ts#L841)

- Valida esquema estricto y checklist antes de aceptar cualquier evidencia.
  [`check-migration-safety.ts:145`](../../scripts/check-migration-safety.ts#L145)

- Deriva objetivos canónicos sin ampliar el catálogo destructivo pactado.
  [`check-migration-safety.ts:750`](../../scripts/check-migration-safety.ts#L750)

- Indexa únicamente marcadores históricos para impedir reutilizar contratos.
  [`check-migration-safety.ts:784`](../../scripts/check-migration-safety.ts#L784)

**Contrato operativo**

- Define formato canónico, checklist, inmutabilidad y consumo único.
  [`README.md:7`](../../prisma/migration-contracts/README.md#L7)

- Declara expand→migrar consumidores→contract como invariante de despliegue.
  [`architecture.md:382`](../../docs/architecture.md#L382)

- Traduce la invariante al procedimiento manual de producción y Vercel.
  [`deploy-vercel.md:156`](../../docs/deploy-vercel.md#L156)

**Pruebas e integración CI**

- Cubre todos los objetivos canónicos del catálogo con evidencia válida.
  [`check-migration-safety.test.ts:496`](../../scripts/check-migration-safety.test.ts#L496)

- Prueba IDs duplicados, consumidos y evidencia incompleta o mutable.
  [`check-migration-safety.test.ts:882`](../../scripts/check-migration-safety.test.ts#L882)

- Ejecuta el gate con historia completa y SHA base exacto antes del build.
  [`ci.yml:58`](../../.github/workflows/ci.yml#L58)

- Expone el CLI reproducible y registra sus pruebas en Vitest.
  [`package.json:12`](../../package.json#L12)
  [`vitest.config.ts:10`](../../vitest.config.ts#L10)
