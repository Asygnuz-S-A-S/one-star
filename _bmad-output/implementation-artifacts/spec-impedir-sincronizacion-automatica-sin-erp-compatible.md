---
title: 'Impedir sincronización automática sin un ERP compatible'
type: 'bugfix'
created: '2026-08-31'
status: 'done'
baseline_commit: '170a8b7f53f72abdf6781e6c410915f37804bac1'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El singleton `ErpSyncConfig` puede permanecer activo aunque el adaptador efectivo sea `NullERPAdapter` o no implemente `fetchCatalog`. Cada vencimiento se reclama y genera otro fallo automático inútil, mientras el panel presenta una programación aparentemente válida.

**Approach:** Derivar una capacidad genérica desde `IERPAdapter`, reconciliar a inactiva cualquier programación incompatible antes de reclamarla, impedir que vuelva a activarse y explicar el bloqueo en el panel. La programación manual seguirá independiente cuando exista capacidad de catálogo.

## Boundaries & Constraints

**Always:** Respetar `Client → Action → Service → Repository → Prisma`; detectar soporte por el contrato `IERPAdapter`, no por nombres de proveedor; desactivar persistentemente el estado incoherente con `nextRunAt=null`; comprobar capacidad antes del `claim`; mantener intervalos y exclusión atómica; diferenciar “automático apagado” de “catálogo no soportado”; conservar diagnóstico de endpoints.

**Ask First:** Cambiar `ERP_PROVIDER`, credenciales, esquema Prisma, defaults para proveedores funcionales o habilitar escrituras de catálogo.

**Never:** Importar adaptadores concretos fuera de `src/server/erp/`; registrar un fallo automático por cada tick sin capacidad; inferir soporte desde `ping`; habilitar catálogo para el adaptador nulo; desactivar sincronización manual cuando el adaptador sí soporta catálogo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Estado heredado incompatible | `enabled=true`, adaptador sin `fetchCatalog` | Persiste `enabled=false`, `nextRunAt=null`; UI explica por qué | No llama ni registra sync ERP |
| Intento de reactivación | Admin envía `enabled=true` sin capacidad | Se rechaza y la UI conserva el estado inactivo | Mensaje seguro y accionable |
| Tick automático incompatible | Config vencida y sin capacidad | Se omite antes de `claimDueErpSync` | Razón explícita `catalog_sync_unavailable` |
| Proveedor compatible | Adaptador con `fetchCatalog` | Conserva programación, concurrencia y sync manual actuales | Fallos ERP siguen en historial |
| Automático pausado compatible | `enabled=false`, con capacidad | Manual continúa disponible | El scheduler omite el tick |

</frozen-after-approval>

## Code Map

- `src/server/erp/erp-capabilities.ts` -- regla genérica y testeable para capacidad de catálogo.
- `src/server/services/erp-sync-scheduler.service.ts` -- reconciliación, validación y guard previo al claim.
- `src/server/repositories/erp-sync-config.repository.ts` -- desactivación atómica que solo cambia `enabled` y `nextRunAt`, preservando el intervalo concurrente.
- `src/server/services/erp-sync.service.ts` -- expone capacidad efectiva en el DTO del panel.
- `src/components/admin/SyncPanel.tsx` -- bloqueo accesible, explicación y controles coherentes.
- `src/server/actions/erp.actions.ts` -- frontera autenticada que devuelve el rechazo del servicio.
- `docs/architecture.md` -- invariante de programación dependiente de capacidad.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/erp/erp-capabilities.test.ts` y `erp-capabilities.ts` -- cubrir adaptadores con/sin `fetchCatalog` antes de implementar la regla.
- [x] `src/server/repositories/__tests__/erp-sync-config.repository.test.ts` y repositorio -- desactivar/limpiar sin validar ni sobrescribir `intervalMinutes`.
- [x] `src/server/services/__tests__/erp-sync-scheduler.service.test.ts` y scheduler -- probar limpieza persistente, estado ya inactivo, rechazo de activación y omisión previa al claim.
- [x] `src/server/services/__tests__/erp-sync.service.test.ts` y estado -- entregar `catalogSyncAvailable` coherente con el adaptador efectivo.
- [x] `src/components/admin/SyncPanel.tsx` y E2E de integraciones -- mostrar el motivo, impedir activación/sync imposible y conservar manual cuando sea compatible.
- [x] `docs/architecture.md` -- documentar reconciliación y ausencia de logs repetitivos.

**Acceptance Criteria:**
- Given un adaptador sin catálogo y configuración activa, when se carga el panel o despierta el scheduler, then queda inactiva persistentemente y no se reclama ninguna ejecución.
- Given que no existe capacidad, when el admin intenta activar el automático, then recibe una explicación y el estado confirmado sigue inactivo.
- Given un adaptador compatible con automático apagado, when el admin sincroniza manualmente, then el flujo manual permanece habilitado.
- Given un adaptador compatible y programación vencida, when corre el scheduler, then conserva exactamente una ejecución por vencimiento.

## Spec Change Log

- **Iteración 1 — reconciliación concurrente:** La revisión detectó que reutilizar `saveErpSyncConfig` con un snapshot anterior podía sobrescribir un intervalo guardado concurrentemente y no limpiaba un `nextRunAt` fantasma si el registro ya estaba inactivo. Se añadió una operación específica de repositorio que actualiza atómicamente solo `enabled=false` y `nextRunAt=null`, sin revalidar ni escribir `intervalMinutes`, y cobertura para ambos estados. **Known-bad evitado:** la lectura del panel pisa cambios administrativos recientes o conserva vencimientos incoherentes. **KEEP:** helper genérico sobre `IERPAdapter.fetchCatalog`, capacidad del adaptador efectivo, rechazo seguro de reactivación, guard anterior al claim, razón `catalog_sync_unavailable`, UI/diagnósticos, sincronización manual compatible, ausencia de migración y documentación.

## Design Notes

La capacidad se calcula sobre la instancia efectiva, por lo que también cubre un proveedor configurado cuyas credenciales faltantes hicieron fallback a `NullERPAdapter`. El servicio de scheduling decide la reconciliación y el repositorio la ejecuta como compare-and-set sobre el `updatedAt` observado, cambiando únicamente `enabled` y `nextRunAt`: nunca recibe ni reescribe el intervalo ni pisa una versión posterior. Así una edición concurrente se conserva y un registro inactivo con `nextRunAt` residual también puede quedar limpio, sin migración.

## Verification

**Commands:**
- `pnpm exec vitest run src/server/erp/erp-capabilities.test.ts src/server/repositories/__tests__/erp-sync-config.repository.test.ts src/server/services/__tests__/erp-sync-scheduler.service.test.ts src/server/services/__tests__/erp-sync.service.test.ts src/server/actions/__tests__/erp.actions.test.ts` -- matriz completa en verde.
- `pnpm exec eslint <archivos modificados> && pnpm exec tsc --noEmit` -- sin errores.
- `pnpm test && pnpm build` -- regresión y build de producción correctos.

**Manual checks (if no CLI):**
- En `/admin/integraciones` con proveedor “Ninguno”, confirmar programación inactiva, motivo visible y ausencia de nueva ejecución automática.

## Suggested Review Order

**Coordinación y persistencia**

- Centraliza reconciliación, rechazo y guard previo al claim automático.
  [`erp-sync-scheduler.service.ts:58`](../../src/server/services/erp-sync-scheduler.service.ts#L58)

- Compare-and-set limpia solo estado observado sin pisar ediciones posteriores.
  [`erp-sync-config.repository.ts:52`](../../src/server/repositories/erp-sync-config.repository.ts#L52)

- La capacidad depende únicamente del contrato efectivo del adaptador.
  [`erp-capabilities.ts:5`](../../src/server/erp/erp-capabilities.ts#L5)

**Estado y experiencia administrativa**

- Expone disponibilidad real junto con programación ya reconciliada.
  [`erp-sync.service.ts:518`](../../src/server/services/erp-sync.service.ts#L518)

- Explica el bloqueo y conserva disponibles los diagnósticos ERP.
  [`SyncPanel.tsx:351`](../../src/components/admin/SyncPanel.tsx#L351)

- Remonta el panel cuando cambia la capacidad del catálogo.
  [`page.tsx:19`](../../src/app/admin/integraciones/page.tsx#L19)

**Cobertura de regresión**

- Demuestra preservación del intervalo y versiones concurrentes.
  [`erp-sync-config.repository.test.ts:26`](../../src/server/repositories/__tests__/erp-sync-config.repository.test.ts#L26)

- Cubre reconciliación, pre-claim, reactivación y exclusión existente.
  [`erp-sync-scheduler.service.test.ts:43`](../../src/server/services/__tests__/erp-sync-scheduler.service.test.ts#L43)

- Valida ambos estados visibles sin ejecutar sincronizaciones.
  [`admin-panel-audit.spec.ts:187`](../../e2e/admin-panel-audit.spec.ts#L187)
