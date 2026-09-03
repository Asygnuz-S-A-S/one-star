---
title: 'Prellenar el registro con los datos del checkout'
type: 'feature'
created: '2026-07-31'
status: 'done'
baseline_commit: '805e1e910c7fe106d50e8ef9072d3bb1013f7aa4'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/REQUERIMIENTOS.md'
  - '{project-root}/docs/stories/story-002.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-login-al-confirmar-checkout.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Una persona puede diligenciar sus datos de contacto y envío en checkout, pero al elegir “Crear cuenta” debe volver a escribir nombre, apellido, teléfono y correo en el registro. Esta repetición añade fricción justo antes del pago.

**Approach:** Cuando el registro se abra con retorno seguro a `/checkout`, leer el borrador temporal ya guardado en `sessionStorage` y prellenar únicamente los campos compatibles del formulario de cuenta. La lectura no consumirá el borrador, para que checkout pueda restaurar después la dirección, el cupón y el método de envío.

## Boundaries & Constraints

**Always:** Prellenar nombre, apellido, correo y preferencia de novedades; prellenar el teléfono solo si normalizado cumple los 10 dígitos exigidos por registro; validar versión, estructura, propietario y vigencia del borrador; limitar el comportamiento a `callbackUrl=/checkout`; conservar editables los valores; mantener el borrador hasta que checkout lo restaure; degradarse sin errores cuando el almacenamiento esté bloqueado.

**Ask First:** Añadir dirección o documento al perfil de usuario; persistir el borrador en base de datos; extender la caducidad; cambiar el flujo de autenticación o Better Auth.

**Never:** Guardar o prellenar contraseña, confirmación de contraseña, cédula, fecha de nacimiento, datos de tarjeta, PSE u otra información de pago; colocar datos personales en query params; confiar en datos sin validar; eliminar el borrador desde registro; sobrescribir cambios locales ajenos.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Retorno desde checkout | Borrador vigente y `callbackUrl=/checkout` | Nombre, apellido, teléfono, correo y novedades aparecen prellenados | Los demás campos permanecen vacíos |
| Registro directo | Borrador existente pero callback distinto | Formulario inicia vacío | No leer ni eliminar el borrador |
| Borrador inválido | Expirado, corrupto o email de propietario inconsistente | No prellenar datos | Ignorarlo sin eliminarlo ni bloquear la página |
| Teléfono incompatible | Checkout contiene menos o más de 10 dígitos | Prellenar los demás campos y dejar teléfono vacío | El usuario lo completa con el formato requerido |
| Almacenamiento bloqueado | `sessionStorage` lanza una excepción | Registro funciona con campos vacíos | No mostrar error técnico |
| Registro exitoso | Usuario crea cuenta y regresa al checkout | Checkout recupera el borrador completo | El registro no lo consume anticipadamente |

</frozen-after-approval>

## Code Map

- `src/lib/checkout-draft.ts` -- valida y almacena el borrador; expondrá una lectura no destructiva y reducida para registro.
- `src/lib/__tests__/checkout-draft.test.ts` -- protege selección de campos, caducidad, propietario y lectura no consumidora.
- `src/app/registro/page.tsx` -- aplica el prellenado solo para el callback seguro de checkout.
- `e2e/auth.spec.ts` -- verifica el formulario prellenado y el mantenimiento del retorno.

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/__tests__/checkout-draft.test.ts` -- agregar ciclos TDD para el prefill seguro, no consumidor y los borradores inválidos.
- [x] `src/lib/checkout-draft.ts` -- exponer un tipo reducido y una función de lectura segura para registro.
- [x] `src/app/registro/page.tsx` -- cargar el prefill en un efecto cliente sin tocar contraseñas ni campos exclusivos del registro.
- [x] `e2e/auth.spec.ts` -- comprobar navegación checkout → registro, campos visibles y callback intacto.

**Acceptance Criteria:**
- Given un visitante que diligenció checkout, when pulsa “Crear cuenta”, then encuentra sus datos compatibles ya escritos y puede editarlos.
- Given que completa el registro, when vuelve a `/checkout`, then conserva dirección, cupón y demás datos originales del borrador.
- Given un acceso normal a registro, when no proviene del checkout, then no aparecen datos residuales de otra navegación.

## Design Notes

La lectura para registro será un “peek”: devuelve una proyección mínima del mismo envelope validado y nunca llama `removeItem` cuando el borrador es válido. El email del formulario debe normalizarse y coincidir con `ownerEmail`; así, el valor usado para crear la cuenta será el mismo que autoriza la restauración posterior en checkout.

## Verification

**Commands:**
- `pnpm vitest run src/lib/__tests__/checkout-draft.test.ts` -- transformación y privacidad del borrador verdes.
- `pnpm exec playwright test e2e/auth.spec.ts --project=chromium` -- prellenado y retorno funcionan en navegador.
- `pnpm exec eslint src/lib/checkout-draft.ts src/lib/__tests__/checkout-draft.test.ts src/app/registro/page.tsx e2e/auth.spec.ts` -- sin errores.
- `pnpm exec tsc --noEmit` -- tipado correcto.
- `pnpm build` -- compilación de producción correcta.

**Manual checks (if no CLI):**
- Diligenciar checkout como visitante, confirmar, elegir registro y verificar los cinco campos; crear la cuenta y confirmar que checkout restaura también dirección y envío.

**Resultados:**
- `pnpm test` -- 18 archivos y 195 pruebas pasaron.
- `pnpm exec playwright test e2e/auth.spec.ts --project=chromium --grep 'prellena el registro' --retries=0 --repeat-each=3` -- 3 recorridos consecutivos pasaron.
- `pnpm exec playwright test e2e/auth.spec.ts --project=chromium --grep 'prellena' --retries=0` -- pasaron el recorrido positivo y el acceso directo sin prefill.
- ESLint focalizado, `pnpm exec tsc --noEmit`, `git diff --check` y `pnpm build` pasaron sin errores.

## Suggested Review Order

**Entrada y aplicación del prefill**

- Activa la lectura únicamente al regresar desde checkout y respeta ediciones locales.
  [`page.tsx:183`](../../src/app/registro/page.tsx#L183)

**Validación y privacidad del borrador**

- Proyecta solo cinco campos compatibles sin consumir ni alterar el envelope.
  [`checkout-draft.ts:175`](../../src/lib/checkout-draft.ts#L175)

- Cubre whitelist, propietario, caducidad, corrupción y teléfono incompatible.
  [`checkout-draft.test.ts:28`](../../src/lib/__tests__/checkout-draft.test.ts#L28)

**Recorrido visible**

- Verifica checkout a registro, campos sensibles vacíos y borrador intacto.
  [`auth.spec.ts:131`](../../e2e/auth.spec.ts#L131)

- Protege el registro directo contra datos residuales del checkout.
  [`auth.spec.ts:171`](../../e2e/auth.spec.ts#L171)
