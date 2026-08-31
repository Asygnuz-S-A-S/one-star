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

## 2026-08-11 — Deuda visual preexistente expuesta al centralizar Landing Builder

- Conectar al header público las opciones ya existentes de color, opacidad, blur y visibilidad móvil; actualmente varias solo se persisten o afectan desktop.
- Alinear la grilla pública con sus campos históricos `bgColor`, `emoji` y `darkText`, incluyendo soporte seguro para colores hexadecimales y contraste.
- Implementar el control público de `showArrows` del hero, que ya existía en el constructor pero no tenía consumidor efectivo.
- Endurecer la concurrencia preexistente de posiciones de navegación/secciones y las transiciones de logo principal con operaciones atómicas en repositorio.
- Sanear URLs históricas de logos también en el header público y mejorar semántica/foco de los modales administrativos trasladados.

## 2026-08-13 — Deuda de instalación expuesta al documentar el proyecto

- Fijar la versión de pnpm en `package.json`/Corepack y en `Dockerfile`; actualmente la imagen instala `pnpm` sin versión, por lo que los builds no son totalmente reproducibles.
- Propagar correctamente en Docker Compose las variables y argumentos de build de Alegra, ePayco y Sentry; hoy el flujo de contenedores solo integra Loggro, Cloudinary y Resend.
- Alinear `.env.example` y `docs/architecture.md` con el código de autenticación: `BETTER_AUTH_SECRET` se describe como alias, pero `src/lib/auth.ts` solo consume `AUTH_SECRET` o `NEXTAUTH_SECRET`.
- Separar el seed demo del arranque repetible de Docker Compose para que recrear `migrate` no pueda sobrescribir precios, promociones o stock editados en los productos de muestra.

## 2026-08-14 — Deuda preexistente expuesta al activar CSP

- Serializar de forma segura el JSON-LD de producto reemplazando `<` por `\u003c` antes de insertarlo en `<script>`. El uso directo de `JSON.stringify` ya permitía cerrar anticipadamente el elemento con contenido malicioso; el nonce bloquea JavaScript adicional sin nonce, pero no corrige la inyección HTML preexistente.

## 2026-08-14 — Defensa adicional para autenticación administrativa

- Evaluar un segundo límite en el handler de credenciales de better-auth para impedir que cuentas administrativas ya sincronizadas omitan `prepareAdminSignIn`. Requiere diseñar cómo distinguir administradores sin alterar el login de clientes y queda fuera del límite solicitado específicamente dentro de la Server Action.

## 2026-08-24 — Canonicalización de IP en el límite administrativo

- Canonicalizar representaciones IPv6 equivalentes antes de calcular la clave del limitador. El proxy confiable normalmente entrega un formato estable, pero el limitador preexistente distingue cadenas textuales que representan la misma dirección; corregirlo requiere definir y probar la política canónica sin mezclarla con el umbral especial para `unknown`.

## 2026-08-25 — Cierre de pendientes de despliegue

- Proteger `main` antes de activar el autodeploy: checks obligatorios, aplicación a administradores y al menos una aprobación humana.
- Corregir el TLS de `new.tiendaonestar.com`: Traefik entrega actualmente su certificado autofirmado predeterminado en lugar de un certificado válido para el dominio.
- Crear el administrador de producción después de confirmar `ADMIN_EMAIL` y `ADMIN_NAME`; generar y entregar la contraseña mediante un canal seguro.
- Configurar y probar en ePayco la URL de confirmación `https://new.tiendaonestar.com/api/epayco/webhook` una vez que TLS y las credenciales de prueba estén listos.
- Actualizar Prisma cuando exista una versión compatible que incorpore `deepmerge-ts >= 8.0.0`; Prisma 6.19.3 fija 7.1.5 y `npm audit` reporta `GHSA-ggr8-5vv4-36mx`. El CLI actual solo procesa configuración versionada en un proceso interno de una ejecución, pero el hallazgo debe revisarse antes de ampliar sus entradas o exposición.

## 2026-08-31 — Correcciones posteriores a la auditoría E2E del administrador

- Separar con route groups la carga del chrome público para que `/admin` no ejecute consultas de navegación, banner, logos y configuración que no consume; requiere la decisión arquitectónica marcada como **Ask First** en la spec de aislamiento del layout.
- Impedir que la sincronización ERP automática permanezca activa cuando el proveedor configurado es `none` o no implementa `fetchCatalog`; limpiar el estado incoherente existente y conservar diagnóstico legible.
- Unificar categorías del catálogo y categorías visuales: crear categorías únicamente desde `/admin/categorias` y hacer que Landing Builder seleccione, ordene y muestre categorías existentes para Inicio.
- Recuperar de forma segura una sola vez ante `ChunkLoadError` después de despliegues y revisar la política externa que devuelve `429 Too Many Requests` durante barridos administrativos acelerados.
- Convertir el editor de productos en un formulario semántico sin alterar su validación ni producir envíos dobles.
