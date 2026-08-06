---
title: 'Diagnosticar y mostrar errores de sincronización ERP'
type: 'bugfix'
created: '2026-08-06'
status: 'done'
baseline_commit: 'bd1e832a58b9049b332939eed845f657fe41ef31'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/integrations/loggro-erp.md'
  - '{project-root}/docs/integrations/loggro-calidad-datos.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El panel marca sincronizaciones ERP en error, pero el historial oculta la causa en un atributo `title` poco accesible y la tarjeta verde de conexión puede hacer pensar que toda la integración funciona. La investigación confirmó que Loggro responde HTTP 200 para conexión y catálogo, pero entrega stock total cero para los SKU en todas las sedes; los éxitos anteriores aceptaban ese cero y dejaron las 1.530 variantes ERP locales sin inventario.

**Approach:** Mantener la protección que bloquea escrituras cuando el inventario completo llega en cero, sanear cualquier mensaje técnico y presentar en `/admin/integraciones` un diagnóstico legible, expandible y accionable. Añadir una prueba explícita, bajo demanda y de solo lectura para verificar por separado los endpoints de conexión, catálogo y disponibilidad del ERP desde la UI.

## Boundaries & Constraints

**Always:** Conservar la arquitectura `Client → Action → Service/IERPAdapter` y el acceso al ERP únicamente mediante `IERPAdapter`; modelar los diagnósticos como capacidad genérica y opcional del adaptador; distinguir disponibilidad de la API frente al resultado de catálogo/stock; ejecutar las pruebas de endpoint solo bajo demanda; renderizar errores como texto; redactar credenciales, tokens y URLs sensibles; limitar la longitud del detalle; mantener navegación y controles accesibles en móvil y teclado; conservar el inventario ante snapshots parciales o completamente en cero.

**Ask First:** Cualquier migración de Prisma, cambio del contrato persistido de `ErpSyncLog`, habilitación de `ERP_CATALOG_WRITES_ENABLED`, restauración masiva de stock, escritura directa en Loggro o diagnóstico que cree movimientos de inventario.

**Never:** Mostrar cuerpos HTTP crudos, secretos o trazas completas en el navegador; desactivar el guard `all_zero`; inventar existencias; modificar stock real durante pruebas; importar el cliente Loggro fuera de `src/server/erp/`; ampliar este trabajo a errores del envío de pedidos al ERP.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Último fallo | Log reciente fallido con mensaje | Bloque visible con causa, explicación y acción sugerida | Mensaje saneado y acotado |
| Historial fallido | Fila con `success=false` | Control “Ver detalle” táctil y accesible | Fallback claro si `error` es nulo |
| Sincronización manual fallida | Action devuelve error | Resultado inmediato usa la misma presentación segura | No expone respuesta cruda ni secretos |
| API conectada, stock fallido | `ping=true`, último sync fallido | La UI diferencia “API ERP conectada” de “Sincronización con error” | Evita estado verde engañoso |
| Ejecución exitosa | `success=true` | Mantiene conteos y estado actual sin mostrar diagnóstico | N/A |
| Error sensible/largo | Token, URL con credenciales o texto excesivo | Se redacta y trunca antes de persistir/devolver | Nunca llega el secreto al cliente |
| Probar endpoints | Admin pulsa “Probar endpoints” | Muestra conexión, catálogo y stock con estado, HTTP, latencia y hora | Operación autenticada, acotada y de solo lectura |
| Endpoint parcial | Conexión y catálogo 200, stock en cero o falla | Cada prueba conserva su estado independiente | Explica que HTTP 200 no implica inventario válido |

</frozen-after-approval>

## Code Map

- `src/server/services/erp-sync.service.ts` -- ejecuta la sincronización, guarda logs y construye el DTO del panel.
- `src/server/repositories/erp-sync-log.repository.ts` -- persiste y consulta `ErpSyncLog`; no requiere cambio de esquema.
- `src/server/erp/erp-error.ts` -- nuevo límite servidor para sanear mensajes antes de guardarlos o enviarlos.
- `src/server/erp/erp.types.ts` y `src/server/erp/ports/erp.port.ts` -- contrato genérico y opcional del diagnóstico de endpoints.
- `src/server/erp/adapters/loggro.client.ts` y `loggro.adapter.ts` -- probes acotados y de solo lectura para conexión, catálogo y disponibilidad.
- `src/server/actions/erp.actions.ts` -- acción autenticada para ejecutar el diagnóstico bajo demanda.
- `src/lib/erp-sync-display.ts` -- presentación pura de causas conocidas y recomendaciones para la UI.
- `src/components/admin/SyncPanel.tsx` -- estado, resultado manual e historial de `/admin/integraciones`.
- `src/server/services/__tests__/erp-sync.service.test.ts` -- cobertura de bloqueo, persistencia y salida saneada.
- `src/lib/__tests__/erp-sync-display.test.ts` -- cobertura de clasificación, fallbacks y recomendaciones.
- `src/server/erp/__tests__/erp-error.test.ts` -- cobertura de redacción y límite de longitud.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/erp/erp-error.ts` y pruebas -- sanear mensajes genéricos sin depender de Loggro y evitar filtraciones.
- [x] `src/server/erp/erp.types.ts`, `ports/erp.port.ts`, adaptador/cliente Loggro y pruebas -- exponer diagnósticos genéricos de conexión, catálogo y stock sin escribir en el ERP.
- [x] `src/server/actions/erp.actions.ts` -- autorizar y ejecutar el diagnóstico bajo demanda sin acoplar la UI a Loggro.
- [x] `src/server/services/erp-sync.service.ts` y pruebas -- sanear antes de persistir/devolver y también al mapear logs históricos; conservar diagnósticos parciales útiles.
- [x] `src/lib/erp-sync-display.ts` y pruebas -- convertir errores conocidos en título, explicación y siguiente acción con fallback estable.
- [x] `src/components/admin/SyncPanel.tsx` -- mostrar último error y detalles expandibles, aclarando que `ping` solo prueba la API.
- [x] Verificar la interfaz y documentar el diagnóstico real sin cambiar inventario ni configuración de escritura.

**Acceptance Criteria:**
- Given que Loggro devuelve stock total cero, when termina la sincronización, then no se escribe catálogo y el panel explica que la API responde pero el inventario ERP llegó en cero.
- Given un error histórico, when el admin abre “Ver detalle”, then ve causa y recomendación completas en móvil y teclado.
- Given un error con material sensible, when se guarda o devuelve, then el cliente recibe una versión redactada y limitada.
- Given un éxito, when se carga el panel, then se conservan los conteos y comportamiento actuales.
- Given un admin autenticado, when pulsa “Probar endpoints”, then ve por separado estado, HTTP, latencia y detalle seguro de conexión, catálogo y disponibilidad.
- Given que disponibilidad responde HTTP 200 con todos los stocks en cero, when termina el diagnóstico, then la UI lo presenta como advertencia/fallo funcional y no como integración sana.
- Given el estado actual, when finaliza la implementación, then ninguna prueba ni comprobación ha creado movimientos o cambiado stock en Loggro.

## Spec Change Log

## Design Notes

`connected` seguirá representando únicamente el healthcheck. La UI lo rotulará como “API ERP” y usará el último log para expresar la salud de la sincronización. La causa actual no se “corrige” aceptando ceros: requiere revisar existencias/configuración en Loggro; el e-commerce debe seguir fallando de forma segura.

## Verification

**Commands:**
- `pnpm test -- src/server/erp/__tests__/erp-error.test.ts src/lib/__tests__/erp-sync-display.test.ts src/server/services/__tests__/erp-sync.service.test.ts` -- todas las pruebas pasan.
- `pnpm eslint src/server/erp/erp-error.ts src/server/services/erp-sync.service.ts src/lib/erp-sync-display.ts src/components/admin/SyncPanel.tsx` -- sin errores.
- `pnpm exec tsc --noEmit` -- sin errores de tipos.
- `pnpm build` -- build de Next.js exitoso.

**Manual checks (if no CLI):**
- Abrir `/admin/integraciones`, comprobar el último error, expandir una fila histórica y confirmar que no aparecen secretos ni texto desbordado.

## Suggested Review Order

**Entrada y experiencia administrativa**

- Coordina prueba bajo demanda, sesión expirada y exclusión mutua con sincronización.
  [`SyncPanel.tsx:152`](../../src/components/admin/SyncPanel.tsx#L152)

- Presenta último fallo, explicación accionable y detalle histórico expandible.
  [`SyncPanel.tsx:244`](../../src/components/admin/SyncPanel.tsx#L244)

- Traduce causas técnicas conocidas a lenguaje operativo estable.
  [`erp-sync-display.ts:14`](../../src/lib/erp-sync-display.ts#L14)

**Frontera autenticada y contrato agnóstico**

- Revalida administración antes de ejecutar cualquier probe del ERP.
  [`erp.actions.ts:21`](../../src/server/actions/erp.actions.ts#L21)

- Normaliza siempre conexión, catálogo y stock aunque el adaptador responda mal.
  [`erp-sync.service.ts:446`](../../src/server/services/erp-sync.service.ts#L446)

- Evita diagnósticos concurrentes y marca la hora real de finalización.
  [`erp-sync.service.ts:489`](../../src/server/services/erp-sync.service.ts#L489)

- Mantiene la capacidad diagnóstica opcional dentro de `IERPAdapter`.
  [`erp.port.ts:84`](../../src/server/erp/ports/erp.port.ts#L84)

**Diagnóstico Loggro seguro y de solo lectura**

- Prueba conexión, catálogo paginado y disponibilidad con presupuesto global.
  [`loggro.client.ts:277`](../../src/server/erp/adapters/loggro.client.ts#L277)

- Redacta secretos, PII, cuerpos crudos y limita mensajes antes del cliente.
  [`erp-error.ts:14`](../../src/server/erp/erp-error.ts#L14)

- Conserva el guard de catálogo completo ante stock total cero.
  [`erp-sync.service.ts:176`](../../src/server/services/erp-sync.service.ts#L176)

**Cobertura de regresión**

- Cubre paginación real, timeouts, bodegas, respuestas malformadas y stock cero.
  [`loggro.client.test.ts:153`](../../src/server/erp/adapters/__tests__/loggro.client.test.ts#L153)

- Demuestra que una sesión no administradora nunca alcanza el diagnóstico.
  [`erp.actions.test.ts:26`](../../src/server/actions/__tests__/erp.actions.test.ts#L26)

- Verifica redacción adversarial de credenciales y datos personales.
  [`erp-error.test.ts:7`](../../src/server/erp/__tests__/erp-error.test.ts#L7)
