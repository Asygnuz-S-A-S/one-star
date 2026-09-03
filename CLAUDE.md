@AGENTS.md

## Documentación del proyecto

Antes de tocar cualquier archivo de código, los agentes deben leer:

- **`docs/architecture.md`** — Stack real, estructura de carpetas, modelo de datos, decisiones tomadas y pendientes. Obligatorio antes de crear o modificar cualquier archivo.
- **`docs/prd.md`** — Requerimientos completos organizados por epics con criterios de aceptación Given/When/Then.
- **`docs/project-brief.md`** — Contexto del negocio, usuarios objetivo y métricas de éxito.
- **`docs/stories/`** — Historias priorizadas con contexto técnico, criterios de aceptación y tareas concretas.

## Reglas para agentes

1. **Leer `docs/architecture.md` primero.** No proponer cambios de stack sin actualizar ese documento.
2. **No inventar datos de negocio.** Toda información sobre One Star proviene de `REQUERIMIENTOS.md` o del código existente.
3. **Seguir el patrón Repository → Service → Action/Route.** La lógica de negocio vive en `src/server/services/`, el acceso a datos en `src/server/repositories/`.
4. **Validar con Zod** en `src/server/validators/` antes de llamar servicios.
5. **Marcar `server-only`** en cualquier módulo que no debe importarse desde el cliente.
6. **Cobertura de tests ≥ 80 %** en servicios y repositorios.
7. Al agregar variables de entorno, documentarlas en la sección correspondiente de `docs/architecture.md`.
