<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:onestar-agent-rules -->
# One Star E-Commerce — Reglas para Agentes

## Lectura obligatoria antes de tocar código

1. `docs/architecture.md` — Stack, estructura de carpetas, modelo de datos y decisiones tomadas.
2. `REQUERIMIENTOS.md` — Requerimientos del negocio y decisiones arquitectónicas (incluyendo ERP).
3. Si la tarea involucra una sección específica, leer el story relevante en `docs/stories/`.

## Patrones de código obligatorios

### Flujo de datos
```
Client Component → Server Action (actions.ts) → Service → Repository → Prisma → PostgreSQL
API Route → Service → Repository → Prisma → PostgreSQL
```
- La lógica de negocio VIVE en `src/server/services/`. No en actions.ts ni en páginas.
- El acceso a datos VIVE en `src/server/repositories/`. Los services no tocan Prisma directamente.
- Validar con Zod en `src/server/validators/` antes de llamar a servicios.
- Todo módulo de servidor DEBE tener `import "server-only"` como primera línea.

### Capa ERP — REGLA CRÍTICA
La tienda es agnóstica al ERP. **NUNCA** importar `AlegraClient`, `AlegraERPAdapter` ni ningún
adaptador concreto fuera de `src/server/erp/`. El código de negocio SOLO usa:

```typescript
import { getERPAdapter } from "@/server/erp"
const erp = getERPAdapter()
await erp.onOrderConfirmed(...)   // ← única forma válida de llamar al ERP
```

Para agregar un nuevo ERP:
1. Crear `src/server/erp/adapters/<nombre>.adapter.ts` implementando `IERPAdapter`
2. Registrar el case en `src/server/erp/erp.container.ts`
3. Documentar las nuevas variables de entorno en `docs/architecture.md`
NO modificar nada más.

### Navegación
- Usar `<Link>` de `next/link` para toda navegación interna. **Nunca `<a href>`**.
- Imágenes: usar siempre `<Image>` de `next/image`.

### Variables de entorno
- Al agregar variables nuevas: documentarlas en `docs/architecture.md` sección "Variables de Entorno".
- Nunca hardcodear credenciales. Siempre desde `process.env`.

## Lo que NO se puede hacer sin actualizar arquitectura

- Cambiar el ORM (Prisma) sin consenso
- Mover la autenticación fuera de better-auth
- Cambiar Tailwind v4 por otra solución de estilos
- Llamar a la API de cualquier ERP directamente desde services sin pasar por `IERPAdapter`
- Crear Server Actions en componentes — van en archivos `actions.ts` separados
<!-- END:onestar-agent-rules -->
