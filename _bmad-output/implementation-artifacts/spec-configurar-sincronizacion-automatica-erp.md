---
title: 'Configurar la sincronización automática del ERP'
type: 'feature'
created: '2026-08-06'
status: 'in-progress'
baseline_commit: '458070bfddb2acc6584cbdf61622b5724ac3a6e2'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/integrations/loggro-erp.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La sincronización automática del ERP está siempre activa y fijada a 30 minutos en el código. El administrador no puede pausarla ni elegir una frecuencia desde `/admin/integraciones`, y el estado mostrado no representa una configuración persistente.

**Approach:** Añadir una configuración persistente administrable con interruptor, intervalos seguros y próxima ejecución. Un coordinador común decidirá y reclamará atómicamente cada ejecución automática, tanto para el cron interno como para el endpoint externo, sin afectar la sincronización manual.

## Boundaries & Constraints

**Always:** Mantener el flujo `Client → Action → Service → Repository → Prisma`; exigir sesión administrativa y validar con Zod; conservar `IERPAdapter` agnóstico sin tocar clientes Loggro; ofrecer 15, 30, 60, 120, 360, 720 y 1440 minutos; programar la siguiente ejecución desde el momento de guardar; reclamar vencimientos atómicamente antes de llamar al ERP; mantener “Sincronizar ahora” disponible aunque el automático esté apagado; mostrar estado, intervalo y próxima ejecución; documentar la limitación del disparador externo/serverless.

**Ask First:** Cambiar el proveedor ERP, habilitar escrituras hoy bloqueadas por `ERP_CATALOG_WRITES_ENABLED`, cancelar una sincronización ya iniciada o cambiar el plan/topología de Vercel.

**Never:** Aceptar expresiones cron arbitrarias; usar variables de entorno como configuración editable; dejar una transacción abierta mientras se consulta Loggro; desactivar sincronizaciones manuales; ejecutar en paralelo el mismo vencimiento; importar un adaptador concreto fuera de `src/server/erp/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desactivar | `enabled=false` | Se guarda, se elimina la próxima ejecución y los disparadores automáticos se omiten | La UI conserva el valor anterior si guardar falla |
| Activar/cambiar intervalo | Intervalo permitido | Se guarda y `nextRunAt` queda en ahora + intervalo | Zod rechaza valores manipulados |
| Ejecución vencida | Activa y `nextRunAt <= ahora` | Un solo proceso reclama, adelanta `nextRunAt` y sincroniza con trigger `AUTO` | El fallo ERP queda en historial; no libera el mismo vencimiento |
| Ejecución no vencida | Inactiva o futura | Cron interno/externo responde como omitido sin tocar el ERP | No se registra como error |
| Sincronización manual | Automático inactivo | El admin puede sincronizar normalmente con trigger `MANUAL` | Conserva protecciones y mensajes actuales |
| Serverless poco frecuente | Scheduler externo diario | La UI/configuración se guarda, pero la ejecución ocurre como máximo cuando invoque el scheduler externo | Se muestra/documenta la limitación operativa |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` y nueva migración -- singleton `ErpSyncConfig` con activación, intervalo y próximo vencimiento.
- `src/server/validators/erp-sync-config.validator.ts` -- contrato Zod y lista única de intervalos permitidos.
- `src/server/repositories/erp-sync-config.repository.ts` -- defaults, upsert y reclamación atómica PostgreSQL.
- `src/server/services/erp-sync-scheduler.service.ts` -- lectura/actualización de configuración y coordinación de ejecuciones vencidas.
- `src/server/actions/erp.actions.ts` -- mutación autenticada para guardar desde admin.
- `src/instrumentation-node.ts` y `src/app/api/cron/sync-erp/route.ts` -- despertador por minuto y coordinador compartido.
- `src/server/services/erp-sync.service.ts` -- incorpora configuración real al DTO del panel.
- `src/components/admin/SyncPanel.tsx` -- interruptor, selector, guardado, mensajes y próxima ejecución.
- `docs/architecture.md` -- persistencia, cadencia y diferencia entre proceso vivo y serverless.

## Tasks & Acceptance

**Execution:**
- [ ] Pruebas de validador/repositorio/servicio/action -- cubrir matriz, permisos y reclamación concurrente antes de producción.
- [ ] Prisma + repositorio -- persistir un único registro y reclamar vencimientos sin mantener locks durante HTTP.
- [ ] Validador + servicio -- aplicar defaults, intervalos permitidos y cálculo estable de `nextRunAt`.
- [ ] Action + cron interno/externo -- autorizar cambios y respetar apagado/vencimiento en ambos disparadores.
- [ ] Estado + `SyncPanel` -- guardar accesiblemente, reflejar éxito/error y conservar el control manual.
- [ ] Arquitectura + verificación UI -- explicar limitaciones y comprobar el flujo completo en Docker.

**Acceptance Criteria:**
- Given un administrador, when desactiva la sincronización y guarda, then el estado queda “Inactiva” y los siguientes disparadores no llaman al ERP.
- Given un intervalo permitido, when lo guarda, then persiste tras recargar y la UI muestra la próxima ejecución correspondiente.
- Given dos disparadores simultáneos para un vencimiento, when intentan reclamarlo, then solo uno ejecuta la sincronización.
- Given el automático desactivado, when el admin pulsa “Sincronizar catálogo”, then la ejecución manual sigue operativa.
- Given un despliegue serverless, when se muestra la configuración, then se advierte que la frecuencia efectiva depende del scheduler externo.

## Spec Change Log

## Design Notes

`node-cron` despertará cada minuto, pero no decidirá la frecuencia. El repositorio hará un `UPDATE ... WHERE enabled AND nextRunAt <= now RETURNING` que adelanta `nextRunAt` antes de la llamada HTTP; así dos procesos no consumen el mismo vencimiento y una falla no produce reintentos inmediatos. Al guardar o reactivar, la primera ejecución queda programada para `ahora + intervalo`.

## Verification

**Commands:**
- `pnpm test -- <pruebas focalizadas>` -- matriz y autorización en verde.
- `pnpm test:coverage` -- cobertura del código nuevo ≥ 80%.
- `pnpm exec tsc --noEmit && pnpm lint && pnpm build` -- tipos, lint y build correctos.
- `docker compose up -d --build app` -- contenedor actualizado.

**Manual checks (if no CLI):**
- En `/admin/integraciones`, guardar otro intervalo, recargar y confirmar persistencia; desactivar y comprobar estado; ejecutar manualmente y verificar que sigue disponible.
