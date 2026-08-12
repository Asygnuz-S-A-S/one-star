# Requerimientos para el desarrollo[cite: 1]
www.tiendaonestar.com[cite: 1]

## Necesidades Básicas:[cite: 1]
* Creación inicial de 7 categorías/marcas[cite: 1]
* Creación inicial de 200 productos.[cite: 1]
* Posibilidad de agregar nuevas marcas de manera sencilla[cite: 1]

## A - Visual de la Web[cite: 1]
**Home:**[cite: 1]
* Banner inicial y se mantienen fijas al navegar en la web (tipo broken chains y hype)[cite: 1]
* Barra superior con logo o nombre de One Star + opciones de menú + carrito y perfil = siempre fijos al navegar en el celular (tipo broken chains)[cite: 1]
* Opciones menú superior: Lanzamientos, Hombre, Mujer, - Niños, SALE, Accesorios, - Tarjeta regalo, - Tiendas[cite: 1]

**Sección productos:**[cite: 1]
* Permita ordenar por: - precio más bajo, precio más alto, Más reciente (llegadas), Más antiguo[cite: 1]
* Filtros: - Genero: unisex, hombre, mujer, niño, niña, infantil, bebe.[cite: 1]
* Filtros: - Marca, - Precio, - Categoría, Color, Talla[cite: 1]

**Visualización de producto:**[cite: 1]
* Minimo 5 fotos por producto. (tamaño mediano en pc)[cite: 1]
* Posibilidad de agregar video-clip 5 segundos.[cite: 1]
* Posibilidad de información o descripción breve del producto bajo las fotos y de descripción extendida más abajo.[cite: 1]

**Registro del cliente:**[cite: 1]
* Permitir acceder con red social[cite: 1]
* Formulario de creación con solicitud de los siguientes datos: Nombre, cédula, teléfono, fecha de nacimiento, correo electronico, marca de preferencia, hombre-mujer.[cite: 1]

**Visualización de producto:**[cite: 1]
* Fotos en tamaño mediano.(tipo broken chains)[cite: 1]
* (Sugerido) Paleta Cromática: * Fondo y espacios en blanco: Gris Concreto (#EOEOEO) y Blanco.[cite: 1]
* Textos y bordes: Negro Carbono (#1C1C1C) y Gris Asfalto (#4A4A4A).[cite: 1]
* Botones de Acción (CTA) y Alertas: Exclusivamente en Rojo One Star (#E31C23).[cite: 1]
* (Sugerido) Tipografía Web: Integración de Google Fonts para Barlow (Títulos, font-weight: 600/700) y Montserrat (Cuerpos de texto, font-weight: 300/400).[cite: 1]

## B. Requerimientos Técnicos.[cite: 1]
1. Core Web Vitals: El desarrollador debe garantizar por contrato un LCP (Largest Contentful Paint) inferior a 2.5 segundos en móviles.[cite: 1]
2. Mobile-First: El diseño debe conceptualizarse primero para pantallas móviles (donde ocurrirá el 85%+ del tráfico) y luego adaptarse a Desktop. Navegación inferior (Bottom navigation bar) recomendada para pulgares.[cite: 1]
3. SEO Técnico (Search Engine Optimization): * Uso de Datos Estructurados (Schema.org) para que Google muestre el precio y las estrellas de calificación directamente en los resultados de búsqueda.[cite: 1]
4. Píxeles y Tracking: Instalación avanzada de la API de Conversiones de Meta y Google Analytics 4 (GA4)[cite: 1]
5. Área de Protección del Logo: El header debe garantizar el espacio equivalente a la letra "O" alrededor del logo, sin importar el tamaño de la pantalla.[cite: 1]
6. Imágenes Next-Gen: Implementación de carga diferida (Lazy Loading) y conversión automática de imágenes a formato WebP.[cite: 1]
7. Galería Dinámica: Capacidad para alojar fotos en estilo Tech-Minimal y video nativo (MP4 sin sonido en loop) demostrando el uso del calzado.[cite: 1]
8. Guía de Tallas Inteligente: Un pop-up claro que explique las equivalencias US/CM/EUR. Vital para reducir devoluciones en marcas como Hoka (horma estándar vs. Wide).[cite: 1]
9. Cross-Selling (Upsell): Módulo de "Completa tu look" para sugerir medias, limpiadores o gorras justo debajo del botón de agregar al carrito.[cite: 1]

## C. Otras necesidades:[cite: 1]
* Posibilidad de cambiar fácilmente Banners, imágenes del home y anuncios de barra superior. (por nuestra cuenta)[cite: 1]
* Máximo 3 clics a compra[cite: 1]
* Crear campañas de descuentos de manera sencilla.[cite: 1]
* Reducir la dependencia de terceros para funcionamiento e incluir desarrollos autónomos o con IA. (No requiere equipo técnico interno permanente)[cite: 1]
* Posibilidad de implementar agentes de IA para la gestión de clientes en las plataformas digitales que involucran la web.[cite: 1]
* Posibilidad de integrar la web con Clientify u otra herramienta de manera sencilla.[cite: 1]
* El checkout requiere una cuenta de cliente autenticada; no se permite la compra como invitado.[cite: 1]
* Integración Whatsapp Business[cite: 1]
* Programa de fidelización[cite: 1]
* Carga de 3 banners para el lanzamiento[cite: 1]
* Páginas estáticas legales[cite: 1]
* Página tipo blog[cite: 1]
* Inclusión de plug in de addi para créditos en línea[cite: 1]
* Configuración pasarela de pago epayco o mercadopago[cite: 1]
* Email personalizado de confirmación de pedido[cite: 1]
* Garantía 3 meses pos-lanzamiento[cite: 1]
* Integración con ERP/POS (ver sección D).[cite: 1]

## D. Integración ERP / Sistema de Inventario (Decisión Arquitectónica Tomada)

**Principio fundamental:** La tienda NO puede depender de ningún ERP específico.
Si se cambia de Alegra a Siigo, World Office, SAP u otro, el código del e-commerce **no debe modificarse**.

### Arquitectura: Ports & Adapters (Hexagonal)

Se implementó una capa de abstracción completa en `src/server/erp/` con el siguiente patrón:

```
E-Commerce Core → IERPAdapter (interfaz) ← Adaptador concreto (Alegra / Siigo / etc.)
```

### Contrato de integración (IERPAdapter)

Cualquier ERP que se conecte DEBE implementar los siguientes métodos:

| Método | Dirección | Descripción |
|---|---|---|
| `onOrderConfirmed(invoice)` | e-commerce → ERP | Al confirmar un pedido: crear factura + mover inventario |
| `decrementStock(items)` | e-commerce → ERP | Descontar stock de variantes por SKU |
| `getStockBySku(sku)` | ERP → e-commerce | Consultar stock de una variante (sincronización bidireccional) |
| `getBulkStock(skus)` | ERP → e-commerce | Consultar stock de múltiples SKUs (ventas en físico/POS → web) |
| `upsertCustomer(customer)` | e-commerce → ERP | Sincronizar cliente/contacto |
| `ping()` | — | Verificar disponibilidad del ERP |

### Modo degradado

Si el ERP no responde, el pedido **siempre se registra en la BD de One Star**. El ERP es notificado en modo fire-and-forget. Nunca se rechaza un pedido por un error del ERP.

### Cómo cambiar de ERP

1. Crear `src/server/erp/adapters/<nuevo-erp>.adapter.ts` implementando `IERPAdapter`
2. Registrar el case en `src/server/erp/erp.container.ts`
3. Cambiar `ERP_PROVIDER=<nuevo-erp>` en `.env`

**Cero cambios** en servicios, páginas, checkout o cualquier otra parte del proyecto.

### Estado actual

- `ERP_PROVIDER=null` → Adaptador nulo activo (desarrollo). La tienda funciona sin ERP.
- Adaptador de **Alegra** implementado y listo para activar con credenciales.
- La arquitectura soporta cualquier ERP futuro sin refactorizar.

### Variables de entorno ERP

```bash
ERP_PROVIDER="null"        # "null" | "alegra" | "siigo" | (futuro)
ALEGRA_EMAIL=""            # Email de la cuenta Alegra
ALEGRA_API_KEY=""          # API Key de Alegra
```

## Referentes de página actuales:[cite: 1]
1. https://hype.com.co/[cite: 1]
2. https://www.brokenchains.com.co/[cite: 1]
3. https://newbalance.com.co/[cite: 1]
