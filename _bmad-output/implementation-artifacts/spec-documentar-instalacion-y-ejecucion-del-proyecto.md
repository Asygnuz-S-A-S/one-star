---
title: 'Documentar instalación y ejecución del proyecto'
type: 'chore'
created: '2026-08-13'
status: 'done'
route: 'one-shot'
---

# Documentar instalación y ejecución del proyecto

## Intent

**Problem:** El README conservaba el texto genérico de Next.js y no permitía instalar, configurar ni ejecutar One Star de forma reproducible.

**Approach:** Sustituirlo por una guía contrastada con los scripts, variables, migraciones, contenedores y herramientas reales del repositorio.

## Suggested Review Order

**Flujo principal**

- Presenta primero requisitos compatibles y una instalación local completa.
  [`README.md:7`](../../README.md#L7)

- Separa preparación de base, seed y creación autenticada del administrador.
  [`README.md:104`](../../README.md#L104)

**Ejecución alternativa y configuración**

- Documenta el stack completo en Compose, accesos y manejo seguro del volumen.
  [`README.md:152`](../../README.md#L152)

- Distingue variables obligatorias, opcionales y limitaciones actuales de Docker.
  [`README.md:200`](../../README.md#L200)

**Operación y soporte**

- Explica comandos seguros, verificaciones, E2E y credenciales necesarias.
  [`README.md:232`](../../README.md#L232)

- Resuelve fallos frecuentes de puertos, Prisma, admin e imágenes.
  [`README.md:307`](../../README.md#L307)

- Registra limitaciones preexistentes descubiertas sin ampliar este cambio documental.
  [`deferred-work.md:46`](deferred-work.md#L46)
