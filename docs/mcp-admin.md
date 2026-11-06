# Conector de Claude para el admin (MCP)

Permite pedirle a Claude cambios del admin de One Star: editar productos, subir imágenes a Cloudinary, editar banners, la barra superior y las secciones de Inicio (incluidas las tarjetas de colección), categorías, marcas y colores.

**Nunca** tiene acceso a pedidos, clientes, leads, PQRS, newsletter, usuarios ni cupones. Tampoco borra nada: eso se hace en el admin.

## 1. Crear tu token

1. Entra a `https://new.tiendaonestar.com/admin/cuenta` (Mi cuenta).
2. En **Conectar con Claude**, ponle un nombre (ej. "Claude del Mac") y elige el permiso:
   - **Inventario**: productos, categorías, marcas, colores e imágenes.
   - **Super Admin**: lo anterior, más Inicio, campañas y banners. Solo aparece si eres Super Admin.
3. Copia el token (`osmcp_…`). **Se muestra una sola vez.** Guárdalo como una contraseña: no lo pegues en chats, documentos ni en el repositorio.

El token vence a los 90 días. Si se pierde o ya no lo usas, dale **Revocar** y deja de funcionar al instante.

## 2. Conectarlo en Claude

### Claude Code (terminal o pestaña Code de la app de escritorio)

Pega esto en la terminal, cambiando `osmcp_TU_TOKEN` por tu token:

```bash
claude mcp add --transport http --scope user onestar https://new.tiendaonestar.com/api/mcp --header "Authorization: Bearer osmcp_TU_TOKEN"
```

Verifica con `claude mcp list`: debe salir `onestar` conectado. Para quitarlo: `claude mcp remove onestar`.

### App de escritorio de Claude (chat normal)

En *Configuración → Desarrollador → Editar configuración* (`claude_desktop_config.json`) agrega:

```json
{
  "mcpServers": {
    "onestar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://new.tiendaonestar.com/api/mcp", "--header", "Authorization:Bearer osmcp_TU_TOKEN"]
    }
  }
}
```

Reinicia la app. claude.ai en el navegador todavía no sirve: exige OAuth y este conector usa token.

## 3. Cómo pedir cambios

Ejemplos:

- "Busca las Hoka Clifton y cámbiale la descripción a…"
- "Sube esta imagen https://…/banner.jpg y crea un banner 'Black Friday' que lleve a /productos?oferta=1."
- "En Inicio, cambia el texto de la segunda tarjeta de colección a 'RUNNING' y guárdalo como borrador."
- "Publica Inicio." (Claude te muestra un resumen y pide confirmación.)

**Borrador y publicación son pasos aparte.** `guardar_borrador_seccion` no cambia la tienda; solo `publicar_pagina` lo publica. Los banners y las secciones nuevas nacen ocultos.

**Lo que sale en vivo al instante** (igual que en el admin): editar un producto publicado, publicar o retirar productos, categorías, marcas, colores, activar u ordenar secciones, editar o activar un banner y la barra superior. Claude marca esas herramientas como destructivas y te pide permiso antes de cada una. No actives "permitir siempre" para ellas.

### Fotos desde tu computador

Claude Code puede subirlas con el mismo token:

```bash
curl -F file=@foto.jpg -H "Authorization: Bearer osmcp_TU_TOKEN" https://new.tiendaonestar.com/api/mcp/upload
```

Responde con la URL de Cloudinary (carpeta `one-star/productos`) y queda en **Archivos**. Máximo 30 MB, solo imagen o video.

## Herramientas

| Herramienta | Permiso | ¿Cambia la tienda? |
|---|---|---|
| buscar_productos, ver_producto, listar_catalogo | Inventario | No |
| editar_producto, publicar_productos | Inventario | Sí, al instante |
| guardar_categoria, guardar_marca, guardar_color | Inventario | Sí, al instante |
| subir_imagen | Inventario | No (solo sube) |
| ver_pagina, listar_banners, listar_archivos | Super Admin | No |
| guardar_borrador_seccion, crear_seccion | Super Admin | No (borrador / oculta) |
| publicar_pagina | Super Admin | **Sí: publica los borradores** |
| activar_seccion, ordenar_secciones | Super Admin | Sí, al instante |
| guardar_banner, activar_banner, editar_barra_superior | Super Admin | Sí (un banner nuevo nace oculto) |

`editar_producto` cambia solo los campos que envías. Variantes, tallas e inventario no se tocan desde Claude.

## Seguridad

- Token propio por admin; en la base de datos solo queda su hash (`McpToken`). No usa la sesión del navegador.
- En cada llamada se vuelve a leer el rol del admin: si lo desactivan o lo bajan a Inventario, el token pierde permisos de inmediato. Ventas nunca entra.
- Cada herramienta llama a la misma acción del admin, con `requireAdmin(área)` y la misma validación zod.
- Bitácora (`McpAuditLog`): quién, qué herramienta, con qué datos, resultado y fecha. Super Admin la ve en Mi cuenta → **Bitácora de Claude**.
- Límites: 60 lecturas y 20 escrituras por minuto por token; 120 peticiones por minuto por IP.

## Para el despliegue (Sebas)

- Incluye la migración `20261105000000_mcp_tokens` (solo crea dos tablas; no toca datos).
- No hay variables de entorno nuevas. El proxy debe seguir fijando `X-Real-IP`, como ya lo hace para el resto de límites.
- Para apagar el conector: revocar todos los tokens en Mi cuenta.
