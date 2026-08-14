---
title: 'Limitar intentos de login administrador'
type: 'bugfix'
created: '2026-08-14'
status: 'done'
baseline_commit: '16d1fc1be81fca8933e882c67cae027429247a91'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/node_modules/next/dist/docs/01-app/02-guides/data-security.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `prepareAdminSignIn` es una Server Action alcanzable mediante un POST directo y valida contraseñas sin limitar intentos. El proxy no puede protegerla completamente porque Next.js identifica estas llamadas mediante `Next-Action`, no mediante una ruta exclusiva.

**Approach:** Consumir dentro de `prepareAdminSignIn` un límite servidor antes de consultar las credenciales. El límite agrupará por IP y correo normalizado, bloqueará temporalmente los excesos y se limpiará después de una autenticación correcta.

## Boundaries & Constraints

**Always:** Mantener la respuesta de credenciales inválidas sin revelar si el administrador existe; admitir cinco intentos por combinación IP/correo durante quince minutos y bloquear el sexto; aplicar el control antes de consultar Prisma o ejecutar bcrypt; obtener la IP desde encabezados del request con fallback seguro; limpiar el registro al validar correctamente; mantener el estado en servidor con memoria acotada y expiración; conservar el flujo actual hacia better-auth.

**Ask First:** Incorporar Redis, una tabla nueva, migraciones, CAPTCHA, bloqueo persistente de cuentas o variables de entorno configurables; cambiar los límites acordados; extender este cambio al login de clientes o a otros endpoints.

**Never:** Confiar en el cliente para contar intentos; guardar contraseñas, hashes o credenciales dentro del limitador; revelar si el correo existe; bloquear permanentemente una cuenta; depender exclusivamente del proxy; modificar la autenticación o las sesiones de better-auth.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Credenciales válidas | Primer intento permitido | Sincroniza los registros better-auth y limpia el contador | Retorna `{ success: true }` |
| Credenciales inválidas | Intentos 1 a 5 en la ventana | Conserva el error genérico y acumula los intentos | No revela si falló correo o contraseña |
| Exceso de intentos | Sexto intento antes de quince minutos | No consulta Prisma ni ejecuta bcrypt | Retorna un mensaje genérico de espera |
| Ventana vencida | Nuevo intento después de quince minutos | Abre una ventana nueva y permite validar | Descarta el contador expirado |
| IP ausente | Request sin encabezado de proxy | Usa una clave estable `unknown` junto al correo normalizado | No omite el límite |
| Variaciones del correo | Mayúsculas o espacios en el mismo correo | Comparten el mismo contador | No permiten evadir el límite |

</frozen-after-approval>

## Code Map

- `src/lib/auth-actions.ts` -- Server Action pública que debe obtener la identidad del request y aplicar el límite antes de validar el administrador.
- `src/server/services/admin-login-rate-limit.service.ts` -- servicio `server-only` responsable del contador temporal, expiración y acotación de memoria.
- `src/server/services/__tests__/admin-login-rate-limit.service.test.ts` -- pruebas unitarias de límite, normalización, expiración y reinicio.
- `src/lib/auth-actions.test.ts` -- prueba de integración de la acción para demostrar que el bloqueo ocurre antes del acceso a datos.
- `src/app/admin/login/page.tsx` -- consumidor actual del resultado; no requiere cambios si conserva el contrato de error.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/services/admin-login-rate-limit.service.ts` -- implementar el límite fijo y acotado sin almacenar información sensible.
- [x] `src/server/services/__tests__/admin-login-rate-limit.service.test.ts` -- desarrollar incrementalmente los escenarios del limitador mediante Red-Green-Refactor.
- [x] `src/lib/auth-actions.ts` -- consumir el límite dentro de `prepareAdminSignIn` antes de Prisma y limpiarlo tras el éxito.
- [x] `src/lib/auth-actions.test.ts` -- probar que el sexto intento se bloquea sin consultar credenciales y que el contrato de respuesta permanece estable.

**Acceptance Criteria:**
- Given cinco intentos de administrador para la misma IP y correo durante quince minutos, when llega el sexto, then la acción rechaza el intento antes de consultar Prisma.
- Given un bloqueo activo, when vence la ventana, then el siguiente intento vuelve a ejecutar la validación normal.
- Given una autenticación administrativa correcta, when termina la preparación, then el contador correspondiente queda limpio sin cambiar la creación posterior de sesión en better-auth.
- Given múltiples escrituras de un correo con espacios o mayúsculas, when se consumen intentos, then todas pertenecen al mismo límite.

## Spec Change Log

- 2026-08-14: Revisión independiente eliminó confianza en `X-Forwarded-For`, validó `X-Real-IP` y movió el reset después de sincronizar better-auth.

## Design Notes

El estado será local al proceso porque producción ya se acordó en una sola instancia. El servicio eliminará entradas vencidas y limitará el número total de claves; esto evita que correos aleatorios produzcan crecimiento ilimitado. Si en el futuro se habilitan réplicas, el mismo contrato deberá respaldarse con un almacenamiento compartido antes de considerar el límite distribuido.

## Verification

**Commands:**
- `pnpm test -- src/server/services/__tests__/admin-login-rate-limit.service.test.ts` -- demuestra cada transición Red-Green del limitador.
- `pnpm test -- src/lib/auth-actions.test.ts` -- demuestra la aplicación del límite dentro de la Server Action.
- `pnpm test` -- conserva verde la suite completa.
- `pnpm build` -- confirma compatibilidad con Next.js 16 y el límite server-only.

## Suggested Review Order

**Aplicación del límite**

- Server Action consume el intento antes de Prisma y bcrypt.
  [`auth-actions.ts:21`](../../src/lib/auth-actions.ts#L21)

- Solo `X-Real-IP` validado cruza la frontera de confianza.
  [`auth-actions.ts:25`](../../src/lib/auth-actions.ts#L25)

- Reset ocurre únicamente después de sincronizar exitosamente better-auth.
  [`auth-actions.ts:43`](../../src/lib/auth-actions.ts#L43)

**Estado acotado**

- Servicio normaliza y hashea IP/correo sin almacenar credenciales.
  [`admin-login-rate-limit.service.ts:20`](../../src/server/services/admin-login-rate-limit.service.ts#L20)

- Capacidad cerrada elimina expirados y evita crecimiento ilimitado.
  [`admin-login-rate-limit.service.ts:31`](../../src/server/services/admin-login-rate-limit.service.ts#L31)

- Ventana fija bloquea exactamente el sexto intento durante quince minutos.
  [`admin-login-rate-limit.service.ts:50`](../../src/server/services/admin-login-rate-limit.service.ts#L50)

**Pruebas y operación**

- Prueba de acción cubre orden, spoofing, fallback y fallos de sincronización.
  [`auth-actions.test.ts:44`](../../src/lib/auth-actions.test.ts#L44)

- Pruebas puras fijan expiración, normalización, reset y capacidad máxima.
  [`admin-login-rate-limit.service.test.ts:10`](../../src/server/services/__tests__/admin-login-rate-limit.service.test.ts#L10)

- Arquitectura documenta la obligación de saneamiento del reverse proxy.
  [`architecture.md:380`](../../docs/architecture.md#L380)
