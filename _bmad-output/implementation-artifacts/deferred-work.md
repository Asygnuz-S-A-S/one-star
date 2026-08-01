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
