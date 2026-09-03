# Informe de cierre — Bloqueos reportados el 2 de septiembre de 2026

> Responde punto por punto al `Informe_Problema_Solucion_OneStar.docx` y al
> `Gantt_OneStar.xlsx`. Rama: `claude/onestar-implementation-plan-f074ca`.

## Resumen

| # | Punto del informe | Estado |
|---|---|---|
| 1 | Loggro responde pero el inventario llega en cero | **Fuera de alcance** — depende de configurar Loggro |
| 2 | Producción sin catálogo operativo | **Fuera de alcance** — consecuencia del punto 1 |
| 3 | Rutas visibles que terminan en 404 | **Resuelto** (`f26b2d1`) |
| 4 | Tarjeta de regalo estática | **Resuelto** (`62dd4b0`), con un alcance mayor al estimado |
| 5 | Facturación electrónica y upsert de cliente en Loggro | **Fuera de alcance** — falta documentación de endpoints |
| 6a | 17 vulnerabilidades altas | **Resuelto** (`a96ac8e`) — el árbol quedó sin vulnerabilidades |
| 6b | Cobertura por debajo del 80 % | **Resuelto** (`80e5707`) — 83,88 % líneas / 84,82 % funciones |
| 7 | Sin ambiente QA aislado | **Fuera de alcance** — requiere credenciales de terceros |
| 8 | Landing Builder sin banners | **Fuera de alcance** — es contenido de diseño |

## Dónde el informe no coincidía con el código

Tres diferencias que conviene conocer antes de planear lo que sigue.

**La tarjeta de regalo estaba peor de lo reportado, no mejor.** El informe decía
que el botón no llevaba el ítem al carrito y lo estimó en «10 minutos a 1 hora».
Eso ya se había arreglado en el commit `8137ec7`, posterior al informe. El
problema real era otro y más grande: el ítem llegaba al carrito pero **el pedido
no se podía pagar**. `checkoutItemSchema` exige `variantId` y `placeOrder` tasa
contra la base de datos; el ítem usaba un id ficticio (`gift-card-50000`) que no
existe como variante, así que el checkout lo rechazaba.

**Las vulnerabilidades habían aumentado.** El informe reportaba 43 con 17 altas.
La medición al empezar dio 54 con 25 altas.

**La cobertura era menor que la reportada.** El informe citaba 60,31 % de líneas
y 47,49 % de funciones. La medición real dio 57,57 % y 46,72 %.

## Lo que se resolvió

### Punto 3 — Rutas 404 y SEO (`f26b2d1`)

- `/buscar`: reutiliza `ShopLayout`, `FilterSidebar` y `ProductGrid`, con un
  formulario GET que funciona sin JavaScript y conserva los filtros activos al
  lanzar un término nuevo.
- `/hombre`, `/mujer`, `/ninos`, `/accesorios`: redirección permanente a la
  categoría canónica `/c/<slug>`, sin duplicar la vitrina.
- `/terminos` y `/privacidad`: documentos conforme a la Ley 1480 de 2011
  (Estatuto del Consumidor, incluidos retracto y reversión del pago) y la Ley
  1581 de 2012 (habeas data).
- `robots.ts` y `sitemap.ts`: el sitemap se arma con categorías y productos
  publicados, y degrada a rutas estáticas si la base de datos falla.
- Se corrigió `prisma/seed.ts`: la grilla del inicio apuntaba a `/hombre` y
  `/mujer` en vez de a `/c/hombre` y `/c/mujer`.

**Hallazgo adicional que el informe no listaba:** el ícono de búsqueda del header
de escritorio (`src/components/Header.tsx`) era un `<button>` sin `onClick` — un
control muerto, del mismo tipo que el de la tarjeta de regalo. Ahora es un `Link`
a `/buscar`.

### Punto 4 — Tarjeta de regalo comprable (`62dd4b0`)

Cada monto pasa a ser un producto real del catálogo con su variante, porque el
precio vive en `Product.basePrice` y no en `Variant`: un solo producto no puede
tener cinco precios distintos.

Se retiró la opción de **monto personalizado**: sin un producto asociado no hay
forma de cobrarla, y dejarla visible llevaba al comprador a un checkout roto.

Se añadió una migración del carrito persistido (`cart.store` v1) que descarta las
tarjetas guardadas con el formato antiguo, para los compradores que ya tenían el
ítem impagable en su `localStorage`.

### Punto 6a — Dependencias (`a96ac8e`)

De 54 vulnerabilidades (25 altas) a **cero de cualquier severidad**. El detalle de
cada actualización y de cada override está en
[`docs/seguridad-dependencias.md`](seguridad-dependencias.md), incluidos los dos
que merecen vigilancia (`sharp` y `deepmerge-ts`).

### Punto 6b — Cobertura (`80e5707`)

De 57,57 % / 46,72 % a **83,88 % de líneas y 84,82 % de funciones**, siguiendo la
estrategia del propio informe: primero el código crítico con peor cobertura
(pagos, inventario, pedidos, autorización), después el resto.

**Defecto encontrado al escribir estos tests:** `.partial()` de Zod no desactiva
los `.default()` del esquema, así que `updateGridBlock` escribía `position: 0`,
`isActive: true` y `darkText: false` aunque el llamador no los enviara. Alternar
la visibilidad de un bloque desde el Landing Builder le reiniciaba la posición y
desordenaba la grilla del inicio. Corregido, con prueba de regresión.

## Lo que quedó fuera y qué hace falta para desbloquearlo

| Punto | Qué falta exactamente |
|---|---|
| 1 y 2 — Loggro e inventario | Entrar a Loggro y revisar la configuración de existencias, establecimientos y bodegas con su propio probador de endpoints. Es configuración, no desarrollo, salvo que la API no responda. |
| 5 — Facturación electrónica y upsert de cliente | Documentación y acceso confirmado a los endpoints de facturación y clientes de Loggro. Sin eso no se puede construir la integración. |
| 7 — Ambiente QA aislado | Credenciales propias: base de datos, almacenamiento de archivos, buzón de correo de pruebas, cuenta sandbox de ePayco (autoservicio) y credenciales de prueba de Loggro. |
| 8 — Banners y carrusel del Landing Builder | Contenido de diseño. El constructor ya funciona; falta que alguien de diseño suba las piezas. |

## Deuda conocida que este trabajo no tocó

La suite E2E cierra en 60 pruebas en verde y **cinco fallos preexistentes**,
todos anteriores a esta rama (se corrió dos veces para descartar inestabilidad;
las dos corridas dieron exactamente los mismos cinco). Los siete que quedan
marcados como «did not run» son las pruebas del panel de administración que
dependen del fixture de sesión que falla en el primero de esos cinco.

Los cinco:

- Tres pruebas de tema oscuro (`e2e/shop.spec.ts:21`, `e2e/auth.spec.ts:100` y
  `e2e/auth.spec.ts:110`) buscan un botón «Cambiar tema» que **ya no existe en el
  código**: se quitó al desactivar el modo oscuro. Son pruebas que verifican una
  funcionalidad retirada a propósito; hay que borrarlas o reescribirlas según lo
  que se decida sobre el tema oscuro.
- `e2e/auth.spec.ts:37` espera ver «Ingresando…» en el botón de login mientras
  carga. El código sí lo renderiza (`src/app/login/page.tsx:189`); la prueba es
  frágil por tiempos.
- `e2e/admin-panel-audit.spec.ts:14` exige cero errores de consola al recorrer el
  panel y encuentra un 404 de una imagen externa del seed de demostración y una
  advertencia de hidratación de Motion.

Ninguno de los cinco fue introducido por este trabajo y ninguno estaba en el
alcance acordado.

Además, `/sale` y `/lanzamientos` (`e2e/shop.spec.ts:288`) fallaron en una de las
dos corridas y pasaron en la otra, y pasan siempre al ejecutarse en aislamiento.
Su aserción de «cero errores de consola» es sensible a la carga: el seed de
demostración apunta a imágenes externas de Unsplash y Nike que ya no existen, y
bajo seis workers en paralelo el optimizador de imágenes devuelve errores que el
filtro del test no descarta. Vale la pena reemplazar esas URLs del seed por
imágenes locales.
