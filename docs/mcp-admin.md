# Conector de Claude para el admin (MCP)

Exclusivo para **Super Admin**. Permite pedirle a Claude cambios de contenido y operación de la tienda: banners, barra superior, secciones de Inicio y campañas (con borrador), configuración general (envíos, tiempos, WhatsApp, contacto, footer), contenido global, menú de navegación, tiendas físicas, marcas, categorías, colores y subida de imágenes a Cloudinary.

**Qué NO puede tocar nunca:**
- **Productos, precios ni stock** (solo consulta productos en lectura para obtener enlaces y referencias).
- **Pedidos, clientes, leads, PQRS, newsletter, usuarios, cupones ni secretos/credenciales.**
- Tampoco borra registros: eso se hace manualmente en el admin.

## 1. Crear tu token (solo Super Admin)

1. Entra a `https://tiendaonestar.com/admin/cuenta` (Mi cuenta) con una cuenta **Super Admin**.
2. En **Conectar con Claude**, ponle un nombre (ej. "Claude del Mac") y dale **Crear token**.
3. Copia el token (`osmcp_…`). **Se muestra una sola vez.** Guárdalo como una contraseña: no lo pegues en chats, documentos ni en el repositorio.

El token vence a los 90 días. Si se pierde o ya no lo usas, dale **Revocar** y deja de funcionar al instante.

## 2. Conectarlo en Claude

> **Importante:** usa siempre **`https://tiendaonestar.com/api/mcp`** (NO `new.tiendaonestar.com`, porque el redireccionamiento entre dominios elimina el encabezado `Authorization` y responde `401`).

### Claude Code (terminal o pestaña Code de la app de escritorio)

```bash
claude mcp add --transport http --scope user onestar https://tiendaonestar.com/api/mcp --header "Authorization: Bearer osmcp_TU_TOKEN"
```

Verifica con `claude mcp list`: debe salir `onestar` conectado. Para quitarlo: `claude mcp remove onestar`.

### App de escritorio de Claude (chat normal)

En *Configuración → Desarrollador → Editar configuración* (`claude_desktop_config.json`) agrega:

```json
{
  "mcpServers": {
    "onestar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://tiendaonestar.com/api/mcp", "--header", "Authorization:Bearer osmcp_TU_TOKEN"]
    }
  }
}
```

Reinicia la app. `claude.ai` en navegador exige OAuth y este conector usa token Bearer.

### Codex (Windows y Mac)

Abre el archivo de configuración global de Codex:
- **Windows:** `%USERPROFILE%\.codex\config.toml`
- **Mac / Linux:** `~/.codex/config.toml`

Agrega este bloque (reemplazando `osmcp_TU_TOKEN` por tu token real):

```toml
[mcp_servers.onestar]
url = "https://tiendaonestar.com/api/mcp"
startup_timeout_sec = 30

[mcp_servers.onestar.http_headers]
Authorization = "Bearer osmcp_TU_TOKEN"
```

Guarda el archivo, **cierra por completo Codex y abre una nueva sesión** (las sesiones ya abiertas no recargan el `config.toml`). Si prefieres usar variable de entorno en Windows en vez de poner el token en el archivo, ejecuta `setx ONESTAR_MCP_TOKEN "osmcp_TU_TOKEN"`, reinicia Codex y usa `bearer_token_env_var = "ONESTAR_MCP_TOKEN"` en lugar de `[mcp_servers.onestar.http_headers]`.

### Fotos desde tu computador

```bash
curl -F file=@foto.jpg -H "Authorization: Bearer osmcp_TU_TOKEN" https://tiendaonestar.com/api/mcp/upload
```

Responde con la URL de Cloudinary (carpeta `one-star/productos`) y queda en **Archivos**. Máximo 30 MB, solo imagen o video.

## 3. Herramientas disponibles (solo Super Admin)

| Herramienta | Tipo | ¿Cambia la tienda? |
|---|---|---|
| `buscar_productos`, `ver_producto`, `listar_catalogo` | Solo lectura | No |
| `guardar_categoria`, `guardar_marca`, `guardar_color` | Escritura | Sí, al instante |
| `subir_imagen`, `listar_archivos` | Archivos | No |
| `ver_pagina`, `guardar_borrador_seccion`, `crear_seccion` | Constructor | No (borrador / oculta) |
| `publicar_pagina`, `activar_seccion`, `ordenar_secciones` | Constructor | **Sí, al instante** |
| `listar_banners`, `guardar_banner`, `activar_banner`, `editar_barra_superior` | Banners | Sí (banner nuevo nace oculto) |
| `ver_configuracion`, `editar_configuracion` | Configuración | Sí (sin secretos ni integraciones) |
| `ver_contenido_global`, `editar_contenido_global` | Contenido global | Sí, al instante |
| `listar_menu`, `guardar_menu` | Navegación | Sí, al instante |
| `listar_tiendas`, `guardar_tienda` | Tiendas físicas | Sí, al instante |

## 4. Seguridad

- Solo cuentas activas con rol **Super Admin** pueden crear o usar tokens (`INVENTORY_OPERATOR` y `SALES_OPERATOR` son rechazados).
- En cada llamada se revalida el rol activo del admin en la base de datos: si lo degradan o desactivan, el token deja de funcionar de inmediato.
- Bitácora (`McpAuditLog`): cada llamada queda registrada y visible en Mi cuenta → **Bitácora de Claude**.
- Límites: 60 lecturas y 20 escrituras por minuto por token; 120 peticiones por minuto por IP.
