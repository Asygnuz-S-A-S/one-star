# Guía de fotografía de producto — One Star

Para el equipo de contenido. Define cómo entregar fotos, videos y piezas para la tienda
(www.tiendaonestar.com) para que el catálogo se vea uniforme y funcionen los efectos de
la web (cambio de foto al pasar el cursor, giro 3D de las tarjetas y escenario del hero).

Estilo según el manual de marca: **Tech-Minimal** (producto como héroe, superficies
limpias, luz controlada). Nada de fondos de colores, marcos, textos ni marcas de agua
dentro de la foto de producto.

---

## 1. Fotos de catálogo (todas las referencias)

Son las que se ven en las tarjetas del catálogo, en la ficha y en el carrito.

### Especificaciones

| Concepto | Requisito |
|---|---|
| Formato | JPG o WebP (PNG solo si es sin fondo) |
| Tamaño | **2000 × 2000 px**, cuadrada (1:1) |
| Fondo | **Blanco puro #FFFFFF**, parejo de borde a borde, o PNG sin fondo |
| Color | sRGB |
| Peso | Menos de 500 KB por foto (máximo que acepta la subida: 30 MB) |
| Cantidad | **Mínimo 5, máximo 8** por referencia y color |

> Por qué el blanco puro: la tienda "funde" el fondo de la foto con el gris de la tarjeta.
> Si el fondo es gris claro o tiene viñeta, se ve un rectángulo alrededor del tenis.

### Encuadre (igual en todas las fotos)

- Tenis **centrado**, ocupando cerca del **80 % del ancho** de la foto.
- **Mismo margen y misma escala** en todas las fotos de la referencia: al recorrer la
  tarjeta con el cursor la foto cambia y el tenis no debe "saltar" de tamaño ni de posición.
- Cámara a la altura del tenis, sin gran angular (no deformar).
- Luz pareja, sin sombras cortadas por el borde. Una sombra suave de contacto en el piso
  está bien.

### Orden de los ángulos (siempre el mismo)

El orden importa: la **foto 1 es la principal** de la tarjeta y el resto se recorre de
izquierda a derecha al pasar el cursor, como si el tenis girara.

1. **Lateral exterior**, punta hacia la izquierda (foto principal).
2. Tres cuartos frontal.
3. Frontal.
4. Tres cuartos trasero.
5. Trasera.
6. Suela.
7. Vista superior (opcional).
8. El par o detalle de material (opcional).

### Colores

Cada color es una referencia distinta: entregar **su propio set completo** de fotos, con el
mismo encuadre y orden que los demás colores del mismo modelo.

### Nombres de archivo y entrega

Una carpeta por SKU base y color, con los archivos numerados en el orden de arriba:

```
VN0009QCNWD/
  VN0009QCNWD_01.jpg   ← lateral exterior (principal)
  VN0009QCNWD_02.jpg
  ...
```

La carpeta de Drive se registra en la columna **URL FOTOS** del Excel de inventario.
Una referencia **sin fotos individuales cargadas se crea despublicada**.

### Errores frecuentes

- Fondo gris, beige o con degradado (se ve un recuadro en la tarjeta).
- Fotos de distinto tamaño o con el tenis más grande en unas que en otras.
- La foto principal no es la lateral.
- Fotos con logos, textos, precios o marcas de agua encima.
- Recortes que tocan el borde de la foto (punta o talón cortados).

---

## 2. Video de producto (opcional, en la ficha)

Clip corto que muestra el tenis en uso o girando.

| Concepto | Requisito |
|---|---|
| Formato | MP4 (H.264) preferido; también WebM o MOV |
| Duración | **3 segundos recomendado**, máximo 15 s |
| Peso | Máximo 20 MB (ideal menos de 5 MB) |
| Sonido | Sin sonido (se reproduce en silencio y en bucle) |
| Proporción | Cuadrado 1080 × 1080 o vertical 1080 × 1350 |
| Contenido | Un solo plano estable; que el inicio y el final empalmen para el bucle |

---

## 3. Secuencia 360° (para el giro 3D real)

Es lo que da la mejor sensación de 3D: el cliente arrastra o pasa el cursor y el tenis gira
completo.

> **Estado:** la tienda todavía **no** tiene el visor 360° (hoy el giro se simula con las
> 5–8 fotos de catálogo). Se recomienda empezar a producir las secuencias con estas reglas
> para los productos destacados y lanzamientos; el visor se desarrolla aparte.

### Cómo se toma

- Base giratoria (tornamesa) y caja de luz o fondo infinito blanco.
- **36 fotos** (una cada 10°) o, como mínimo, **24 fotos** (una cada 15°).
- La cámara **no se mueve** entre fotos: misma altura, distancia, zoom, enfoque y luz.
- El tenis va **centrado sobre el eje de giro**: si está corrido, "baila" al girar.
- Empezar en la vista **lateral exterior con la punta a la izquierda** y girar siempre en el
  mismo sentido (horario visto desde arriba).

### Entrega

| Concepto | Requisito |
|---|---|
| Formato | JPG con fondo blanco puro, o PNG/WebP sin fondo |
| Tamaño | 1600 × 1600 px, cuadrada |
| Peso | Menos de 150 KB por foto (la secuencia completa se carga junta) |
| Nombres | `SKU_360_01.jpg` … `SKU_360_36.jpg`, en orden de giro |
| Carpeta | Una por SKU y color, separada de las fotos de catálogo |

### Alternativas

- **Video 360°:** un MP4 de 3–5 s con el tenis girando una vuelta completa en la tornamesa
  (mismas reglas de fondo y encuadre). Es más fácil de producir, pero el cliente no
  controla el giro.
- **Modelo 3D (GLB):** permite rotar libremente y ver en realidad aumentada. Es lo más
  costoso (escaneo o modelado por producto); solo para lanzamientos estrella y con
  aprobación previa.

---

## 4. Escenario del hero (producto flotando)

Es la composición de la portada en la que el tenis flota y gira sobre una palabra gigante.
Se arma en el constructor (**Admin → Constructor visual → Hero → Producto en primer
plano**), dejando vacías las imágenes de fondo.

| Concepto | Requisito |
|---|---|
| Formato | **PNG o WebP sin fondo** (transparente) |
| Vista | **Lateral exterior, punta hacia la izquierda**, sin rotar (la web aplica la inclinación) |
| Tamaño | 2000 px de ancho mínimo, recortado al borde del tenis con un margen mínimo |
| Recorte | Limpio, a mano o con herramienta profesional: **sin halos blancos**, sin restos de fondo en la suela ni entre los cordones |
| Sombra | **Sin sombra** (la página dibuja la sombra en el piso) |
| Peso | Menos de 600 KB |
| Texto alternativo | Marca, modelo y color. Ej.: "Tenis HOKA Tecton X 3 verde con suela naranja" |

El titular del slide define la palabra gigante del fondo (usa la primera palabra, por
ejemplo "TECTON"): conviene un titular corto.

---

## 5. Banners de campaña (hero y promos)

Cada campaña se entrega en **tres versiones** de la misma pieza; la web elige la correcta
según la pantalla.

| Pieza | Escritorio | Tablet | Móvil |
|---|---|---|---|
| Hero principal (portada) | 1920 × 800 | 1200 × 800 | 1080 × 1350 |
| Banner promocional / carrusel | 1920 × 600 | — | 1080 × 1080 |

Reglas:

- **No poner el titular, el texto ni los botones dentro de la imagen.** Los escribe la web
  encima (se pueden editar, traducir y se leen en cualquier pantalla).
- **Zonas libres para el texto:** en escritorio, el texto va a la **izquierda** (dejar el
  40 % izquierdo sin elementos importantes). En móvil, el texto va en la **mitad de abajo**
  (dejar el sujeto y el logo de la marca en la mitad de arriba).
- **Zona segura en móvil:** en teléfonos altos la web puede recortar hasta un 17 % por cada
  lado de la versión móvil; mantener logos y caras dentro del **65 % central** del ancho.
- JPG o WebP, sRGB, menos de 500 KB por versión.
- Texto alternativo que describa la escena (no el eslogan).

---

## 6. Checklist antes de entregar

- [ ] Fotos cuadradas de 2000 × 2000 px, fondo blanco puro.
- [ ] Entre 5 y 8 fotos por referencia y color, en el orden de ángulos.
- [ ] Mismo encuadre y escala en todas las fotos de la referencia.
- [ ] Archivos nombrados `SKU_01`, `SKU_02`, … y carpeta registrada en **URL FOTOS**.
- [ ] Video (si aplica): 3 s, sin sonido, menos de 20 MB.
- [ ] Hero de escenario (si aplica): PNG sin fondo, lateral con punta a la izquierda, sin halos.
- [ ] Banners en sus tres versiones, sin texto dentro de la imagen.
- [ ] Texto alternativo escrito para cada imagen de campaña.
