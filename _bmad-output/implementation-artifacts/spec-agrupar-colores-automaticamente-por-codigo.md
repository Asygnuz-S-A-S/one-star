---
title: 'Agrupar automáticamente colores del mismo modelo por código ERP'
type: 'feature'
created: '2026-08-06'
status: 'done'
baseline_commit: '6ede2d70e3a9563e7b2dd46fb44a725191127de3'
context:
  - '{project-root}/docs/architecture.md'
  - '{project-root}/docs/integrations/loggro-calidad-datos.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-relacionar-productos-por-color.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La persona del panel todavía debe asignar manualmente una familia a cada producto-color y ve un selector masivo de color redundante. Los códigos de Loggro ya contienen, para varias marcas, una parte estable de modelo y otra de color.

**Approach:** Derivar en el adaptador Loggro una clave opcional de familia mediante reglas explícitas y conservadoras por formato de código. One Star agrupará automáticamente solo coincidencias confiables, mantendrá el editor manual como excepción y retirará “Asignar color a todas las variantes”; el color individual seguirá editable cuando Loggro no lo detecte.

## Boundaries & Constraints

**Always:** Mantener cada producto, SKU, talla, stock, precio y fotos como registros independientes; usar el código ERP como fuente primaria; separar las reglas específicas dentro del adaptador Loggro y exponer al core solo una clave ERP agnóstica; exigir al menos dos productos con colores reales distintos; hacer el proceso idempotente y transaccional; conservar familias manuales existentes; mostrar en el resultado cuántas familias se crearían, crearán o se omitirán.

**Ask First:** Agregar una regla para una marca/formato nuevo; fusionar familias manuales en conflicto; reactivar automáticamente un producto que el administrador retiró; agrupar por nombre cuando el código no comparta una clave estable.

**Never:** Agrupar por parecido difuso del nombre; asumir que cualquier prefijo común representa un modelo; mover variantes entre productos; sobrescribir colores elegidos por el administrador; habilitar `ERP_CATALOG_WRITES_ENABLED`; modificar stock, precio, SKU, fotos o descripciones durante el backfill.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Código confiable | `MAUI-245BE`, `MAUI-245NE`, `MAUI-245VE` | Una familia `loggro:013:MAUI` con tres productos-color | No modifica sus variantes |
| Formato por marca | Skechers `180361BKNT/GRN/GRY`, On `3ME30113323/3427`, Vans `VN000D22...` | Cada regla produce una clave estable y namespaced | Pruebas con ejemplos reales protegen cortes incorrectos |
| Prefijo engañoso | `RV8-DEO`, `RV8-MNK`, `RV8-OCK` | Permanecen independientes porque no existe regla confiable aplicable | Se reportan como no reconocidos, no como error |
| Familia manual | Cualquier candidato ya pertenece a una familia creada en admin | Se omite el grupo completo; la familia manual queda intacta | Se registra una advertencia sin añadir, quitar ni fusionar miembros |
| Color inválido | Miembro sin color real o color duplicado | No se crea una familia ambigua | Se informa el producto omitido |
| Reejecución | La misma clave ya fue procesada | Cero duplicados y cero cambios innecesarios | Resultado idempotente |

</frozen-after-approval>

## Code Map

- `src/server/erp/adapters/loggro-color-family-key.ts` -- reglas puras y explícitas de código por marca Loggro.
- `src/server/erp/adapters/loggro-catalog.normalizer.ts` y `src/server/erp/erp.types.ts` -- exponen `colorFamilyKey` opcional sin filtrar campos Loggro al core.
- `prisma/schema.prisma` y `prisma/migrations/*_add_erp_color_family_key/` -- persisten la clave derivada e indexada en `Product`.
- `src/server/domain/erp-color-family.plan.ts` -- plan puro de creación, adhesión, omisión y conflicto.
- `src/server/repositories/erp-catalog.repository.ts` y `src/server/services/erp-sync.service.ts` -- persisten/reconcilian la clave solo al crearla o cambiarla.
- `src/server/services/erp-color-family-backfill.service.ts` y repositorio asociado -- previsualización y aplicación segura sobre los productos existentes.
- `src/components/admin/ProductForm.tsx` -- elimina el control masivo redundante, conserva color por variante y familia manual excepcional.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/erp/adapters/__tests__/loggro-color-family-key.test.ts` y `loggro-color-family-key.ts` -- implementar por TDD reglas confiables para Skechers (004), On (006), Hoka (007), Vans calzado/ropa (003/010), Discovery (013), Nike con guion (002) y ropa codificada (008), dejando otras marcas sin clave.
- [x] `src/server/erp/erp.types.ts`, `loggro-catalog.normalizer.ts`, `prisma/schema.prisma` y migración -- transportar y guardar `colorFamilyKey` opcional sin alterar identidad ERP.
- [x] `src/server/domain/erp-color-family.plan.ts`, repositorios y pruebas -- planificar familias con colores distintos, precedencia manual, conflictos e idempotencia bajo bloqueo transaccional.
- [x] `src/server/services/erp-sync.service.ts` -- reconciliar solo productos nuevos o cuya clave cambió, sin reinsertar una exclusión manual en sincronizaciones posteriores.
- [x] `src/server/services/erp-color-family-backfill.service.ts` -- ofrecer dry-run y aplicar el backfill existente únicamente después de validar conteos y conflictos.
- [x] `src/components/admin/ProductForm.tsx` -- retirar selector masivo y ajustar el texto para explicar color automático con edición individual de respaldo.
- [x] `docs/architecture.md` y `docs/integrations/loggro-calidad-datos.md` -- documentar cobertura, marcas no reconocidas y procedimiento de ampliación.

**Acceptance Criteria:**
- Given productos Loggro con un código de modelo reconocido y colores distintos, when se sincroniza o ejecuta el backfill, then aparecen automáticamente como colores navegables de una sola tarjeta sin mapearlos en admin.
- Given un formato desconocido o una colisión, when se genera el plan, then no se agrupa nada inseguro y el diagnóstico identifica la causa.
- Given una familia manual o un producto retirado manualmente, when vuelve a sincronizar Loggro sin cambiar la clave, then la decisión administrativa permanece intacta.
- Given el editor de producto, when se abre la sección de variantes, then no aparece el selector masivo y sigue disponible el color individual para corregir excepciones.

## Spec Change Log

## Design Notes

La clave se namespacéa como `proveedor:código-marca:modelo` para evitar colisiones. El adaptador conoce reglas Loggro; el servicio solo recibe una cadena opcional. El backfill se ejecuta en dos fases —preview y apply— y no depende de activar la escritura general del catálogo.

La ejecución real reconoció claves conservadoras en 256 de 367 productos y creó 37 familias seguras con 83 productos. Otros 127 grupos se omitieron por tener un solo color, color inválido o color duplicado, y 111 productos quedaron diagnosticados como formato no reconocido. Converse y varios New Balance permanecen fuera porque sus códigos no comparten una porción de modelo suficientemente confiable; forzarlos por nombre contradiría la protección contra agrupaciones incorrectas.

## Verification

**Commands:**
- `pnpm vitest run src/server/erp/adapters/__tests__/loggro-color-family-key.test.ts src/server/domain/__tests__/erp-color-family.plan.test.ts` -- reglas y conflictos verdes.
- `pnpm prisma validate && pnpm prisma generate && pnpm test && pnpm tsc --noEmit` -- esquema, suite y tipos válidos.
- `pnpm exec eslint <archivos-modificados> && pnpm build && docker compose build app` -- calidad y producción correctas.

**Manual checks (if no CLI):**
- Previsualizar el backfill, aplicar en local y comprobar MAUI/Skechers/On/Vans; confirmar que RV8, Converse y conflictos permanecen independientes.

**Resultado:**
- 250 pruebas pasaron; TypeScript, ESLint, Prisma y `next build` quedaron verdes.
- Backfill aplicado con fingerprint aprobado: 37 familias creadas, 83 productos enlazados, ninguna familia con menos de dos miembros.
- Segunda previsualización: 0 claves cambiadas, 0 familias por crear/actualizar y 37 familias sin cambios.
- Docker reconstruido y saludable; verificación visual confirmó MAUI con Beige, Gris, Negro y Verde.

## Suggested Review Order

**Derivación y planificación**

- Las reglas conservadoras por marca extraen solo modelos con formato conocido.
  [`loggro-color-family-key.ts:12`](../../src/server/erp/adapters/loggro-color-family-key.ts#L12)

- El adaptador entrega una clave opaca sin filtrar lógica Loggro al dominio.
  [`loggro-catalog.normalizer.ts:67`](../../src/server/erp/adapters/loggro-catalog.normalizer.ts#L67)

- El plan puro protege familias manuales, colores ambiguos y exclusiones administrativas.
  [`erp-color-family.plan.ts:58`](../../src/server/domain/erp-color-family.plan.ts#L58)

**Persistencia y sincronización**

- La reconciliación transaccional comparte bloqueo y conserva identidades durante reemplazos.
  [`erp-color-family.repository.ts:76`](../../src/server/repositories/erp-color-family.repository.ts#L76)

- La sincronización aplica claves únicamente después de persistir cada producto Loggro.
  [`erp-sync.service.ts:340`](../../src/server/services/erp-sync.service.ts#L340)

- El preview/apply usa fingerprint y diagnostica formatos no reconocidos.
  [`erp-color-family-backfill.service.ts:38`](../../src/server/services/erp-color-family-backfill.service.ts#L38)

- El esquema distingue claves de producto y familias automáticas sin mezclar inventario.
  [`schema.prisma:73`](../../prisma/schema.prisma#L73)

- La migración añade columnas e índices reversibles sobre datos existentes.
  [`migration.sql:1`](../../prisma/migrations/20260806160000_add_erp_color_family_key/migration.sql#L1)

**Seguridad administrativa y experiencia**

- El guardado detecta formularios obsoletos y evita convertir familias sin cambios.
  [`product-color-family.plan.ts:47`](../../src/server/domain/product-color-family.plan.ts#L47)

- La edición manual y el ERP usan la misma exclusión mutua transaccional.
  [`product.repository.ts:195`](../../src/server/repositories/product.repository.ts#L195)

- El selector masivo desaparece; el color individual queda como respaldo explícito.
  [`ProductForm.tsx:773`](../../src/components/admin/ProductForm.tsx#L773)

- La sección manual permanece únicamente para excepciones de códigos desconocidos.
  [`ProductForm.tsx:914`](../../src/components/admin/ProductForm.tsx#L914)

**Pruebas y documentación**

- Las pruebas cubren precedencia manual, duplicados, adhesión y color ambiguo.
  [`erp-color-family.plan.test.ts:7`](../../src/server/domain/__tests__/erp-color-family.plan.test.ts#L7)

- La arquitectura documenta identidad ERP, backfill y navegación por color.
  [`architecture.md:123`](../../docs/architecture.md#L123)
