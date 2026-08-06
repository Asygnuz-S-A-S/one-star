# Trabajo diferido

## 2026-07-25 — Checkout exclusivo para clientes autenticados

- Prellenar email, nombre y datos de perfil en el checkout para sesiones `customer`; `docs/stories/story-002.md` ya lo exige, pero el checkout anterior tampoco lo implementaba y queda fuera del gate de autenticación.
- Estabilizar los E2E preexistentes de “Ingresando...” y catálogo `/productos`: el primero puede perder el estado transitorio si la respuesta es inmediata y el segundo selecciona primero un encabezado de filtros oculto en desktop.

## 2026-07-29 — Endurecimiento del CRUD de colores preexistente

- Definir semántica de colores inactivos y paleta vacía: ocultarlos de nuevas selecciones sin romper variantes históricas ni reactivar la paleta de respaldo.
- Proteger renombres y unicidad con una clave normalizada (mayúsculas y acentos), migrando variantes en una transacción o bloqueando colores en uso; rechazar nombres reservados como `N/A`, `Sin color` y `-`.
- Corregir el conteo de uso para coincidencia exacta y componentes separados por `/`, evitando falsos positivos como `Azul` dentro de `Azul Marino` y el patrón N+1 del panel.
- Conservar combinaciones históricas en el selector y definir una UX coherente para crear combinaciones arbitrarias.
- Deduplicar también los colores del filtro público con la misma normalización usada por las tarjetas.
- Añadir pruebas de servicio/acciones, sanitizar errores internos y mejorar responsive/accesibilidad de `ColorManager`.
- Alinear `src/server/actions/product-color.actions.ts`, `/admin/colores` y `ProductColor` con la ubicación y documentación arquitectónica del proyecto.
- Revisar fuera de esta historia la ampliación de permisos en `.claude/settings.local.json`; no debe mezclarse con cambios funcionales.

## 2026-07-31 — Inicio de sesión al confirmar checkout

- Persistir y recuperar el pedido `PENDING`/los datos de ePayco cuando la página se recarga después de crear el pedido pero antes de completar el pago; el flujo preexistente vuelve al formulario y puede crear un pedido duplicado.

## 2026-07-31 — Prellenado de registro desde checkout

- Persistir realmente la preferencia de recibir novedades al crear una cuenta. El checkbox y su estado ya existían en registro, pero `registerCustomer` y el modelo de usuario no consumen ese valor; queda fuera del prellenado visual y no debe mezclarse con este cambio.

## 2026-08-06 — Seguimiento de catálogo ERP y familias de color

- Optimizar la paginación pública de familias para no cargar todos los IDs coincidentes en cada petición cuando el catálogo crezca; conservar exactamente los filtros, el orden estable y el conteo por familia visible.
- Añadir pruebas de integración con PostgreSQL para crear, editar, retirar, disolver y eliminar familias, además de pruebas de componente para los enlaces y placeholders. La validación manual y las pruebas puras/servicio cubren el flujo actual, pero no sustituyen esa cobertura persistente.
- Endurecer por separado la escritura masiva del catálogo ERP: bloqueo distribuido entre instancias, persistencia atómica, reconciliación primaria por `erpId`, retiro/stock cero de variantes ausentes y protección de familias/reseñas durante reparaciones. Estos riesgos pertenecen al trabajo previo del sincronizador y no a la relación local por color.
- Corregir en el normalizador ERP los casos de código padre vacío, suma neta de stock cero e historial con semántica heredada; revisar que una reparación nunca reutilice el mismo producto destino para grupos distintos.
- Hacer que la reparación del catálogo falle cerrada ante snapshots vacíos, incompletos o con ítems descartados, y exigir límites/confirmación explícita antes de cualquier borrado masivo. El flujo de reparación permanece deshabilitado y no se ejecutó en esta entrega.
- Preservar en servidor el nivel de inventario web administrado por el ERP al guardar el formulario; aceptar desde admin únicamente inventario de tiendas físicas y detectar formularios obsoletos.
- Validar precios y stock externos como números finitos y no negativos antes del dry-run/escritura; ampliar el dry-run para detectar conflictos de identidad, SKU y slug antes de habilitar escrituras.
- Persistir en `ErpSyncLog` los conteos separados de productos, variantes y definiciones para conservar el diagnóstico después de recargar el panel.
