---
title: 'Alertar y limitar el login administrador sin IP confiable'
type: 'bugfix'
created: '2026-08-24'
status: 'done'
baseline_commit: '108da7f4983df2fb0984b1f7088578294a825d5e'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-limitar-intentos-login-administrador.md'
  - '{project-root}/node_modules/next/dist/docs/01-app/02-guides/data-security.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Cuando `X-Real-IP` falta o no es válido, todos los intentos hacia un correo administrador comparten el balde `unknown`. Mantener cinco intentos permite que un tercero bloquee al administrador con facilidad, mientras que omitir el límite abriría fuerza bruta y el fallo de la frontera del proxy pasaría inadvertido.

**Approach:** Mantener el comportamiento fail-closed, elevar únicamente el balde `unknown` a veinte intentos por correo cada quince minutos y emitir un evento de seguridad Sentry deduplicado cuando la cabecera confiable falte, esté vacía o sea inválida.

## Boundaries & Constraints

**Always:** Conservar cinco intentos para IP válidas y bloquear el sexto; permitir veinte intentos para `unknown` y bloquear el vigesimoprimero; validar sólo `X-Real-IP` e ignorar `X-Forwarded-For`; aplicar el límite antes de Prisma/bcrypt; alertar tanto `missing` como `invalid`; usar mensaje/fingerprint estable, nivel `warning` y tags sin correo, contraseña, IP ni valor crudo de la cabecera; deduplicar la alerta a máximo una por proceso cada quince minutos; conservar respuesta genérica y reset después del éxito completo.

**Ask First:** Cambiar los umbrales o la ventana; incorporar Redis, persistencia, CAPTCHA o bloqueo de cuenta; configurar reglas externas del proyecto Sentry; extender el cambio a clientes u otros endpoints.

**Never:** Quitar el límite cuando la IP sea desconocida; confiar en IP aportada por el cliente; incluir PII o credenciales en telemetría; hacer depender la autenticación de que Sentry entregue el evento; cambiar sesiones o flujo better-auth.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| IP válida | `X-Real-IP` contiene IPv4/IPv6 válida | Cinco intentos permitidos; sexto bloqueado; no alerta | Respuesta genérica sin consultar Prisma al bloquear |
| IP ausente o vacía | Cabecera nula o whitespace | Usa `unknown`, alerta `missing`, permite 20 y bloquea 21 | No incluye datos del intento en Sentry |
| IP inválida | Cabecera no representa una IP | Usa `unknown` y alerta `invalid` | No confía ni reporta el valor crudo |
| Alerta repetida | Varios intentos sin IP dentro de 15 minutos | Solo el primero emite evento; todos siguen limitados | La autenticación no depende de telemetría |
| Ventana vencida | Pasa el cooldown/ventana | Nueva alerta y nueva ventana de intentos | Descarta estado expirado |

</frozen-after-approval>

## Code Map

- `src/lib/auth-actions.ts` -- clasifica la cabecera confiable, dispara la alerta y consume el límite antes de credenciales.
- `src/server/services/admin-login-rate-limit.service.ts` -- aplica umbrales distintos con una normalización única de IP.
- `src/server/services/admin-login-security-alert.service.ts` -- emite y deduplica el evento Sentry sin datos sensibles.
- `src/server/services/admin-login-security-event-sanitizer.service.ts` -- reconstruye el evento de seguridad desde una allowlist final y comparte su tag estable con el emisor.
- `src/instrumentation-node.ts` -- conecta el sanitizer como `beforeSend` del SDK Sentry de Node.
- `src/lib/auth-actions.test.ts` -- fija integración, orden, cabeceras y ausencia de alertas con IP válida.
- `src/server/services/__tests__/admin-login-rate-limit.service.test.ts` -- fija 5/6 para IP conocida y 20/21 para `unknown`.
- `src/server/services/__tests__/admin-login-security-alert.service.test.ts` -- prueba payload seguro, razones y cooldown.
- `src/server/services/__tests__/admin-login-security-event-sanitizer.service.test.ts` -- prueba la eliminación por construcción de PII y la preservación de eventos ajenos.
- `src/instrumentation-node.test.ts` -- verifica en memoria el `beforeSend` y la forma final del evento, sin red.
- `docs/architecture.md` -- documenta el umbral degradado y la alerta operativa.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/services/admin-login-rate-limit.service.ts` y test -- derivar el máximo desde la IP normalizada y cubrir `unknown`, vacío, reset y expiración.
- [x] `src/server/services/admin-login-security-alert.service.ts` y test -- crear alerta Sentry `warning` con fingerprint estable, tags seguros y cooldown local.
- [x] Sanitizer, instrumentación y tests -- imponer la allowlist final en `beforeSend` y reintentar sin cooldown cuando la captura falla.
- [x] `src/lib/auth-actions.ts` y test -- distinguir `missing`/`invalid`, alertar antes de consumir el balde `unknown` y mantener el corte previo a datos.
- [x] `docs/architecture.md` -- explicar el equilibrio 5/20, la deduplicación y la regla de notificación externa pendiente.

**Acceptance Criteria:**
- Given una IP confiable, when llega el sexto intento en quince minutos, then se bloquea antes de Prisma y no se emite alerta.
- Given una cabecera ausente, vacía o inválida, when llegan veinte intentos, then se conservan permitidos y el vigesimoprimero se bloquea bajo `unknown`.
- Given múltiples intentos `unknown` en una ventana, when se reporta el evento, then Sentry recibe como máximo uno sin PII y la autenticación conserva su contrato.

## Spec Change Log

- 2026-08-24: Implementación completada con TDD; se agregaron umbrales 5/20, alerta Sentry segura, deduplicación local e integración previa al acceso a credenciales.
- 2026-08-24: La revisión de seguridad agregó una allowlist `beforeSend`, reintento después de fallo de captura y validación `isIP` también dentro del limitador.

## Design Notes

Se adopta 20 como el extremo inferior del rango recomendado de 20–30: reduce el bloqueo accidental sin cuadruplicar más de lo necesario la superficie de fuerza bruta. `captureMessage` crea el issue de seguridad; la notificación a personas depende de una regla de alertas en Sentry y queda fuera de este PR.

## Verification

**Commands:**
- `pnpm test -- src/server/services/__tests__/admin-login-rate-limit.service.test.ts` -- expected: límites 5/6 y 20/21, reset y expiración pasan.
- `pnpm test -- src/server/services/__tests__/admin-login-security-alert.service.test.ts` -- expected: payload, reasons, deduplicación y cooldown pasan.
- `pnpm test -- src/server/services/__tests__/admin-login-security-event-sanitizer.service.test.ts src/instrumentation-node.test.ts` -- expected: allowlist final y conexión `beforeSend` pasan sin red.
- `pnpm test -- src/lib/auth-actions.test.ts` -- expected: orden del bloqueo y clasificación de cabeceras pasan.
- `pnpm lint && pnpm test && pnpm exec tsc --noEmit` -- expected: calidad completa sin errores.

**Resultados (2026-08-24):**
- Focales: 5 archivos y 23 pruebas pasaron.
- Suite completa: 60 archivos y 447 pruebas pasaron.
- `pnpm exec tsc --noEmit`: pasó.
- ESLint focal sobre los diez archivos TypeScript modificados: pasó.
- `pnpm lint`: bloqueado por errores preexistentes y artefactos generados bajo `.claude/worktrees/**`, `.next/**` y `coverage/**`; no reportó errores en los archivos de este cambio.
- Cobertura de servicios modificados: 100% de líneas y funciones; 94.7% de ramas en el limitador y 100% en alerta y sanitizer. El umbral global queda bloqueado por servicios fuera del alcance sin cobertura.

## Suggested Review Order

**Decisión y aplicación del límite**

- Clasifica la frontera confiable y corta antes de consultar credenciales.
  [`auth-actions.ts:22`](../../src/lib/auth-actions.ts#L22)

- Mantiene 5/6 para IP válida y aplica 20/21 únicamente a `unknown`.
  [`admin-login-rate-limit.service.ts:58`](../../src/server/services/admin-login-rate-limit.service.ts#L58)

- Emite la señal operativa deduplicada sin afectar la autenticación.
  [`admin-login-security-alert.service.ts:14`](../../src/server/services/admin-login-security-alert.service.ts#L14)

**Privacidad de la telemetría**

- Reconstruye el evento desde una allowlist final y descarta contexto heredado.
  [`admin-login-security-event-sanitizer.service.ts:8`](../../src/server/services/admin-login-security-event-sanitizer.service.ts#L8)

- Instala el sanitizer en la última frontera previa al transporte Sentry.
  [`instrumentation-node.ts:4`](../../src/instrumentation-node.ts#L4)

- Documenta umbrales, deduplicación, privacidad y configuración externa pendiente.
  [`architecture.md:387`](../../docs/architecture.md#L387)

**Pruebas de regresión**

- Demuestra 20/21 para cabeceras vacías e inválidas antes de Prisma.
  [`auth-actions.test.ts:126`](../../src/lib/auth-actions.test.ts#L126)

- Simula credenciales y cookies heredadas para verificar la allowlist exacta.
  [`admin-login-security-event-sanitizer.service.test.ts:12`](../../src/server/services/__tests__/admin-login-security-event-sanitizer.service.test.ts#L12)

- Confirma la conexión real de `beforeSend` sin tráfico externo.
  [`instrumentation-node.test.ts:22`](../../src/instrumentation-node.test.ts#L22)
