# Cómo llegan los datos de Loggro y cómo evitar retrabajo

**Análisis actualizado el 2026-08-13** sobre la sincronización real: 1897 registros
del ERP → **367 productos padre con 1530 variantes reales**. Sirve para coordinar
a **quien carga en Loggro** y a **quien completa la ficha en la web**.

> **Estado:** la reparación fue aplicada. Las 367 definiciones falsas y 9 variantes
> obsoletas se retiraron; 98 variantes se reagruparon y el editor ya carga todas
> las tallas bajo su producto para asignar color y fotos.

---

## 1. Qué llega y qué no

| Dato | ¿Llega del ERP? | Quién lo resuelve |
|---|---|---|
| SKU / código | ✅ Sí | — |
| Nombre | ✅ Sí | — |
| Precio | ✅ Sí (3 en $0) | Loggro |
| Stock por talla | ✅ Sí (suma las 3 tiendas) | Loggro |
| Tallas | ✅ Sí, del sufijo `_38` | Loggro |
| **Color** | ⚠️ Deducido del nombre — 90 % acierta | Automático + web |
| **Marca** | ⚠️ Loggro envía código; el adaptador lo normaliza con el nombre | Automático + web |
| **Categoría del menú** | ⚠️ Accesorios y chanclas/sandalias se deducen del nombre | Automático + web |
| **Género** | ⚠️ Deducido del nombre y descripciones | Automático + web |
| **Fotos** | ❌ Nunca llegan | **Web (inevitable)** |
| **Descripción larga** | ❌ No existe en el ERP | Web |

Los productos ERP siguen entrando sin descripción ni foto. El género ya se deduce de señales
explícitas y solo completa productos sin clasificar; una selección manual nunca se sobrescribe.

---

## 2. Problemas detectados (con datos)

### 2.1 Ítems "definición" que inventan tallas falsas — *técnico*

Loggro marca cada ítem con `definicion`:

- `definicion: true` → **367 ítems**: el producto base, sin talla (`1155111-MVR`)
- `definicion: false` → **1530 ítems**: la variante real (`1155111-MVR_10`)

La sincronización anterior trataba a los dos igual, así que el producto base
entraba como si fuera una talla y producía valores basura en el filtro:

| SKU | Talla que quedó | Qué es en realidad |
|---|---|---|
| `1155111-MVR` | `MVR` | código de color |
| `1168690-VYN` | `VYN` | código de color |
| `HM6803-101` | `101` | código de color Nike |
| `WILDPATH-145-CA` | `145-CA` | talla + color |

Además parte el producto en dos: la base cae en el grupo `1155111` y sus tallas
en `1155111-MVR`. **Es la causa de los 40 productos con una sola talla.**

→ **Corregido:** los ítems `definicion: true` ya no crean tallas ni productos
duplicados; `definidoEn_uuid` determina el producto padre.

### 2.2 Marcas sin nombre — *corregido*

Loggro envía el código de categoría (`004`), nunca el nombre. Antes esto creaba
13 marcas llamadas "Por nombrar (00X)", visibles en el filtro de la tienda.

Equivalencias deducidas de los nombres de producto:

| Código | Marca real | Productos | | Código | Marca real | Productos |
|---|---|---|---|---|---|---|
| 004 | Skechers | 142 | | 006 | On | 12 |
| 001 | Converse (calzado) | 83 | | 010 | Vans (ropa) | 11 |
| 003 | Vans (calzado) | 51 | | 002 | Nike | 6 |
| 013 | Discovery | 27 | | 011 | *(bolsas)* | 5 |
| 008 | Converse (ropa) | 27 | | 012 | New Era | 3 |
| 007 | Hoka | 20 | | 009 | Discovery | 1 |
| 005 | New Balance | 13 | | | | |

**Ojo:** la categoría de Loggro mezcla *marca + línea* y el código `008` incluso mezcla
Converse, Columbia, Reshoevn8r y obsequios. Por eso el adaptador prioriza una marca explícita
en el nombre y usa el código solo como respaldo. `001 + 008` pueden terminar en Converse,
`003 + 010` en Vans y `009 + 013` en Discovery, sin unir sus categorías de producto.

### 2.3 Productos que no deberían publicarse

| Producto | Por qué |
|---|---|
| `BOLSA GRANDE DE VENTA`, `BOLSA PEQUEÑA`, `BOLSA TELA GRIS…` (código 011) | Empaque de la tienda, no es mercancía |
| `Tenis NewB de prueba`, `Nike test` | Pruebas |
| `RESHOEVN8R 8OZ CLEANING SOLUTION` | Producto real, pero conviene revisar su categoría |

Entran a la tienda como cualquier otro producto y hay que despublicarlos a mano.

### 2.4 Errores de digitación en el ERP

- `SKECEHRS ZAPATILLA DAMA…` → **Skechers mal escrito**: rompe la detección de marca.
- `CAMISETA CONVERSE BLANCA ESTAMAPDO COLORES` → "estampado" mal escrito.
- `TENIS ON CLOUD 6 HOMBRE NEGRO NEGRO` → color repetido.

### 2.5 Datos incompletos

- **3 productos con precio $0**: `Nike test`, `BOLSA GRANDE DE VENTA`, `BOLSA PEQUEÑA`.
- **194 tallas sin color**: en su mayoría residuos de pruebas viejas (`M7652`, `TEST`, `NB574AZ`).

---

## 3. Qué se puede automatizar (sin trabajo manual)

Ordenado por impacto:

| # | Mejora | Ahorro |
|---|---|---|
| 1 | **Ignorar ítems `definicion: true`** | Elimina tallas basura y productos partidos |
| 2 | **Marca desde nombre + código auditado** ("TENIS SKECHERS…" → Skechers) | **100 %** de los 367 productos |
| 3 | **Género desde el nombre** (HOMBRE/MUJER/UNISEX/NIÑO…) | **98,4 %** de los productos |
| 4 | **Categoría conservadora para accesorios y chanclas/sandalias** | 27 productos actuales |
| 5 | Marcar como no publicable lo que no es mercancía (bolsas, pruebas, precio $0) | evita despublicar a mano |

Con 1–4, cada producto llegaría a la web **con marca, género, categoría, color,
tallas, precio y stock**, y a la persona de la web solo le quedarían **las fotos
y la descripción**.

---

## 4. Acuerdos sugeridos con quien carga en Loggro

Nada de esto es obligatorio para que funcione, pero cada punto elimina trabajo manual:

1. **Nombre con estructura fija**: `TIPO + MARCA + GÉNERO + MODELO + COLOR`
   → `TENIS SKECHERS MUJER OUTDOOR VIGOR AT GRIS` (así ya vienen la mayoría).
   Es de donde se deducen marca, género, categoría y color.
2. **Escribir bien la marca** — `SKECEHRS` rompe la detección.
3. **Colores de la paleta**: usar los nombres estándar (Negro, Blanco, Gris, Azul…).
   Para dos colores, `NEGRO/BLANCO`. Evitar inventados ("PERLA GRIS") salvo que
   se agreguen antes en `/admin/colores`.
4. **Código con la talla al final tras guion bajo**: `125645BKW_9.5`
   (así ya viene). El prefijo `MODELO+COLOR` es lo que agrupa el producto.
5. **No cargar empaque ni pruebas** en el catálogo, o avisar qué códigos son
   para excluirlos.
6. **Todo producto con precio** distinto de $0.
7. **Stock en la bodega correcta**: la web suma Fundadores + Centro + Unicentro.

---

## 5. Flujo recomendado (sin retrabajo)

```
Loggro (persona del ERP)              Web (persona de contenido)
─────────────────────────             ──────────────────────────
1. Crea el ítem con nombre     →  (sincroniza solo, cada 30 min)
   estructurado y su código
2. Carga precio y existencias  →  Producto ya aparece con marca,
                                  género, categoría, color, tallas,
                                  precio y stock
                                  ↓
                               3. Solo agrega FOTOS y descripción
                                  y revisa la categoría sugerida
```

**Regla de oro:** la web nunca pisa lo que se edita a mano. Fotos, descripción,
categoría, género y color asignados se conservan en cada sincronización. El ERP
solo propone categoría al crear un producto nuevo, completa el género cuando aún
está vacío y continúa actualizando precio y stock.

### Cobertura real de género (2026-08-13)

La lectura de los 367 productos padre actuales produjo: 87 Hombre, 72 Mujer, 131 Unisex,
23 Niño, 14 Niña y 34 Infantil. Quedaron 6 sin clasificar: las 5 bolsas de empaque y el SKU
`1162012-BWHT`, cuyo nombre padre contiene señales contradictorias (`HOMBRE MUJER`).

El backfill local se aplicó el 2026-08-13: dejó clasificados 361 productos ERP cuyo género estaba vacío.
La escritura fue condicional por `erpId + gender IS NULL`, por lo que no cambió clasificaciones
manuales ni tocó stock, precio, categoría, variantes, fotos o datos dentro de Loggro.

El nombre del producto padre tiene precedencia. Esto evita errores observados en Loggro donde el
padre dice `HOMBRE`, pero la descripción de una talla termina en `MUJER` (y viceversa). El detalle
de variante solo se consulta cuando el nombre padre no contiene una señal reconocible.

En la tienda, `/c/hombre` muestra `HOMBRE + UNISEX`, `/c/mujer` muestra `MUJER + UNISEX` y
`/c/ninos` reúne Niño, Niña, Infantil y Bebé. Las demás rutas siguen filtrando por categoría.

### Cobertura real de categorías explícitas (2026-08-13)

El nombre padre permite clasificar de forma conservadora 27 productos actuales: 14 como
`accesorios` y 13 como `chanclas-y-sandalias`. Accesorios reconoce gorras, mochilas, maletines,
cinturones, cordones, medias/calcetines y productos Reshoevn8r; chanclas y sandalias comparten
una sola categoría de tienda.

La regla excluye bolsas de empaque, obsequios, `MEDIA BOTA`, tenis `SIN CORDON` y palabras que
aparezcan accidentalmente dentro del nombre de otro producto. El backfill local fue aplicado
con una vista previa de 27 candidatos y una huella SHA-256 aprobada. Una segunda vista previa
dejó 0 candidatos, por lo que el proceso es idempotente.

En sincronizaciones normales la categoría sugerida solo se usa al crear productos nuevos.
Los productos existentes, incluso si un administrador decide dejarlos en `sin-categoria`, no
se reclasifican automáticamente. Los históricos se corrigen únicamente con el backfill explícito,
que además condiciona cada escritura a que el producto todavía conserve la categoría por defecto.

### Cobertura real de marcas (2026-08-13)

El backfill local reemplazó las marcas provisionales de los 367 productos ERP y eliminó los
13 registros `Por nombrar (00X)` que quedaron vacíos. La distribución ERP resultante fue:
142 Skechers, 91 Converse, 62 Vans, 17 Discovery, 12 On, 11 Hoka, 11 New Balance, 6 Reshoevn8r,
3 Columbia, 3 Nike, 3 New Era y 6 productos sin fabricante identificable bajo `Sin marca`.

La aplicación exigió una vista previa con huella SHA-256 y condicionó cada cambio al `erpId` del
producto más el código y nombre exactos de la marca provisional. Una segunda vista previa dejó
0 candidatos. La sincronización normal usa la sugerencia solo al crear productos nuevos; nunca
reemplaza una marca existente ni una selección manual.

---

## 6. Familias automáticas por código

El normalizador deriva una clave local solo para formatos de código auditados. La clave tiene
forma `loggro:<código-marca>:<modelo>` y el resto del e-commerce la trata como texto opaco.

| Código Loggro | Cobertura conservadora | Corte de modelo |
|---|---|---|
| `004` | Skechers | prefijo numérico de 5–6 dígitos |
| `006` | On | primeros 7 caracteres; los últimos 4 son color |
| `007` | Hoka | 7 dígitos anteriores al guion |
| `003`, `010` | Vans calzado/ropa | primeros 8 caracteres `VN…` |
| `013` | Discovery | nombre anterior al bloque de talla/color |
| `002` | Nike con guion | dos letras + cuatro dígitos antes del color numérico |
| `008` | ropa codificada | 8 dígitos o 2 letras + 4 dígitos antes del guion |

Converse (`001`), New Balance (`005`), New Era, bolsas, códigos libres como `RV8-*` y cualquier
formato que no cumpla exactamente esas expresiones quedan sin clave. No se agrupan por nombre ni
por prefijos aproximados.

Para ampliar cobertura se debe auditar una muestra real, agregar una regla explícita y sus casos
positivos/negativos en `loggro-color-family-key.test.ts`, y documentar aquí el corte. No se cambia
el servicio ni se filtran campos propios de Loggro fuera del adaptador.

### Backfill seguro

1. Desplegar la migración aditiva `add_erp_color_family_key`.
2. Ejecutar `previewErpColorFamilyBackfill()` y revisar familias a crear/actualizar, omisiones,
   colores inválidos, duplicados y conflictos manuales.
3. Aprobar el `fingerprint` exacto del preview.
4. Ejecutar `applyErpColorFamilyBackfill(fingerprint)` una sola vez. Si cambió cualquier candidato,
   se rechaza y hay que volver al paso 2.

El preview nunca escribe. El apply usa bloqueo transaccional, es idempotente y no requiere activar
`ERP_CATALOG_WRITES_ENABLED`; tampoco modifica stock, precio, SKU, variantes, fotos o descripciones.
