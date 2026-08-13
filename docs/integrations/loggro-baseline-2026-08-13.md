# Línea base Loggro — 2026-08-13

Esta línea base registra el estado previo a reparar la sincronización de inventario.
No contiene credenciales ni cuerpos crudos de la API.

## Contención aplicada

- Proveedor activo: `loggro`.
- Escrituras de catálogo: deshabilitadas mediante `ERP_CATALOG_WRITES_ENABLED=false`.
- Programación automática: deshabilitada en `ErpSyncConfig` el 2026-08-13.
- `nextRunAt`: `null` mientras dure la reparación.
- Los pedidos recién creados en estado `PENDING` no invocan `onOrderConfirmed` ni generan
  salidas de inventario en Loggro.
- Todas las exportaciones automáticas de pedidos hacia el ERP están temporalmente pausadas,
  incluso para pedidos que luego cambien a `PAID`. La reactivación requiere implementar primero
  una transición pagada idempotente, con registro de entrega y reintentos.
- La sincronización manual y los diagnósticos autenticados de solo lectura permanecen disponibles.

## Catálogo observado

| Métrica | Valor |
|---|---:|
| Registros entregados por Loggro | 1.897 |
| Definiciones de producto padre | 367 |
| Variantes vendibles | 1.530 |
| Productos ERP en One Star | 367 |
| Productos ERP en `Sin Categoría` | 367 |
| Productos ERP sin género | 367 |
| Marcas provisionales `Por nombrar (...)` | 13 |

## Inventario local

| Métrica | Valor |
|---|---:|
| Variantes ERP con `Variant.stock = 0` | 1.530 |
| Stock total en `Variant.stock` para variantes ERP | 0 |
| Variantes ERP con nivel de Bodega Web | 0 |
| Variantes ERP vendibles desde el checkout | 0 |

La sincronización de catálogo actualiza `Variant.stock`, mientras el checkout consulta
`InventoryLevel` con `storeLocationId = null`. Esta divergencia se reparará después de validar
la lectura de existencias del proveedor.

## Diagnóstico de lectura

- Conexión: saludable, HTTP 200.
- Catálogo: saludable, HTTP 200, 1.897 registros reportados.
- Disponibilidad: HTTP 200, pero una muestra distribuida de 100 SKU devolvió stock total cero
  en Centro, Unicentro y Fundadores.
- Alcance configurado: `LOGGRO_STOCK_SCOPE=all`.

## Historial relevante

- Última sincronización registrada como exitosa: 2026-08-05, disparo manual.
- Las diez ejecuciones automáticas anteriores a la contención fallaron.
- Fallos observados: consulta parcial, timeout, error de red y respuesta completa con stock total cero.
- Los bloqueos de seguridad conservaron el inventario existente ante respuestas parciales o todo cero.

## Condiciones para avanzar

1. Elegir SKU con existencia conocida en la interfaz de Loggro.
2. Confirmar establecimiento, bodega y cantidad para esos SKU.
3. Reproducir exactamente esas cantidades mediante el endpoint de disponibilidad.
4. Mantener pausadas las escrituras hasta que los resultados coincidan.

## Seguimiento de la lectura de stock

El 2026-08-13 se verificó el endpoint oficial de disponibilidad contra toda la estructura
empresarial entregada por Loggro:

- 1.530 SKU inventariables y activos.
- 7 bodegas consultadas, incluyendo Punto de Venta, Separados y establecimiento principal.
- 112 peticiones HTTP 200.
- 10.710 filas de disponibilidad resueltas.
- 0 SKU con `cantidadDisponible` mayor que cero.

El formato observado coincide con el contrato consumido por el adaptador: `codigo` y
`cantidadDisponible`. La API real exige además una bodega asociada; omitirla retorna HTTP 400.

Se corrigieron dos fragilidades del cliente:

1. La bodega publicable ya no depende del orden de la respuesta: se prioriza `Bodega Punto de Venta`
   y no `Bodega Separados`.
2. Los lotes se consultan con concurrencia máxima de cuatro peticiones.
3. Las bodegas `Separados` se excluyen incluso cuando no existe otra bodega candidata.
4. La lectura tiene un presupuesto total de 60 segundos y limita a 10 los descartes de SKU
   inválidos por lote; superar esos límites produce un resultado parcial y bloquea escrituras.

Después de la corrección, la descarga completa resolvió los 1.530 SKU en 22,5 segundos, sin
faltantes ni errores. El resultado siguió siendo `all_zero`, por lo que el bloqueo de seguridad
permanece activo.

### Acción requerida en Loggro

El operador del ERP debe localizar un SKU que la interfaz muestre con existencias, indicando:

- código exacto de la variante;
- establecimiento;
- bodega;
- cantidad disponible mostrada.

Si ningún SKU tiene saldo, primero se deben registrar o revisar las entradas/movimientos de
inventario en Loggro. No se debe habilitar la sincronización de escritura ni inventar stock local
para ocultar esta condición.
