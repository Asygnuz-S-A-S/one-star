# Trabajo diferido

## 2026-07-25 — Checkout exclusivo para clientes autenticados

- Prellenar email, nombre y datos de perfil en el checkout para sesiones `customer`; `docs/stories/story-002.md` ya lo exige, pero el checkout anterior tampoco lo implementaba y queda fuera del gate de autenticación.
- Estabilizar los E2E preexistentes de “Ingresando...” y catálogo `/productos`: el primero puede perder el estado transitorio si la respuesta es inmediata y el segundo selecciona primero un encabezado de filtros oculto en desktop.
