# Auditoría E2E del panel administrador

**Fecha:** 2026-08-30

**Entorno:** Producción — `https://new.tiendaonestar.com`

**Navegador:** Chromium

**Alcance:** UI administrativa, Landing Builder y diagnóstico ERP de solo lectura

## Resultado ejecutivo

- 16 escenarios funcionales pasaron en producción: 9 de la suite base y 7 de la auditoría ampliada.
- Las 14 rutas principales cargaron correctamente con navegación pausada.
- El CRUD de una categoría temporal pasó: crear, editar, eliminar y comprobar limpieza.
- La vista previa del Landing Builder mostró el hero, la grilla de categorías y newsletter publicados.
- Las cinco rutas visuales heredadas redirigieron correctamente al Landing Builder.
- La navegación administrativa móvil abrió el menú y permitió acceder a Dashboard y Landing Builder.
- Los controles de alta de cupones, marcas, colores, productos y sucursales, junto con Configuración, estuvieron disponibles sin guardar cambios.
- No se ejecutaron pagos, pedidos, sincronizaciones ERP ni cambios de configuración.

## Cobertura

| Área | Verificación | Resultado |
|---|---|---|
| Acceso | Redirección sin sesión, formulario, credenciales inválidas y login válido | Pasa |
| Dashboard | Encabezado y métricas principales | Pasa |
| Pedidos | Carga de listado | Pasa |
| Clientes | Clientes y carritos abandonados | Pasa |
| Cupones | Listado y apertura/cancelación del formulario | Pasa |
| Productos | Listado y editor de producto nuevo | Pasa |
| Categorías | Carga y CRUD temporal completo | Pasa |
| Marcas | Apertura/cancelación del formulario | Pasa |
| Colores | Formulario de nuevo color | Pasa |
| Landing Builder | Bloques, redirects heredados y preview público | Pasa |
| Tiendas | Formulario de nueva sucursal | Pasa |
| Configuración | Campos y acción de guardado | Pasa |
| Integraciones | Estado, programación, historial y controles sin sincronizar | Pasa con defectos de configuración |
| Móvil | Menú administrativo a 390 × 844 | Pasa con conflicto de layout |

## Hallazgos

### Alta — ERP programado sin proveedor funcional

El proveedor aparece como **Ninguno**, pero la sincronización automática está activa cada 30 minutos. El historial muestra fallos repetidos con `fetchCatalog no implementado`. La interfaz debería impedir activar la programación sin un adaptador funcional o desactivarla automáticamente.

### Alta — El layout público también se renderiza dentro del admin

El header público, su navegación y un `<main>` exterior siguen presentes en las rutas administrativas. En móvil esto crea dos botones accesibles llamados **Abrir menú** y puede causar conflictos de foco, capas y navegación. También produce dos regiones `<main>` anidadas.

### Media — Respuestas 429 al recorrer rápidamente el panel

Dos barridos acelerados recibieron `Too Many Requests` después de 6–9 navegaciones. El mismo barrido de 14 rutas pasó al espaciar cada navegación 2,5 segundos. Conviene revisar el límite del proxy/WAF y documentar un ritmo seguro para monitoreo y E2E.

### Media — Carga transitoria de chunks

Una sesión ya abierta mostró `ChunkLoadError` al entrar a Integraciones; una pestaña nueva cargó correctamente. Es compatible con desalineación de caché durante despliegues. Conviene invalidar assets antiguos o recargar automáticamente una vez ante este error.

### Media — Dos conceptos de categoría siguen mezclados

`/admin/categorias` administra la taxonomía del catálogo, mientras Landing Builder administra tarjetas/grillas visuales independientes. La recomendación es mantener la creación de categorías solo en el gestor de catálogo y hacer que Landing Builder únicamente seleccione, ordene y muestre categorías existentes en Inicio.

### Baja — Editor de producto sin formulario semántico

El editor funciona mediante un botón `type="button"` con `onClick`, sin elemento `<form>`. Esto limita el envío con Enter y la semántica accesible.

## Cambios en automatización

- Se corrigieron selectores ambiguos de Email y Contraseña.
- Se reemplazaron comprobaciones genéricas de `<main>` por encabezados y controles funcionales.
- Se agregó un fixture autenticado reutilizable por worker para evitar logins repetidos.
- Se añadió `e2e/admin-panel-audit.spec.ts` con cobertura integral y limpieza de datos temporales.

## Verificación técnica

- `eslint` sobre los tres archivos E2E modificados: pasa.
- `tsc --noEmit`: pasa.
- Suite base de admin: 9/9 pasa.
- Auditoría ampliada: 7/7 escenarios verificados en ejecuciones segmentadas de producción.

## Seguridad y datos

Las credenciales se suministraron solo mediante variables de entorno y no se guardaron en el repositorio. La única mutación fue una categoría identificada con prefijo `E2E QA`; fue editada y eliminada dentro del mismo escenario, con limpieza en `finally`.
