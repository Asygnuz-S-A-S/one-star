---
name: "loggro-erp-integration"
description: "Guía de arquitectura y reglas para la integración bidireccional y sincronización de catálogo con el ERP Loggro."
---

# Integración con Loggro ERP

Esta skill documenta la arquitectura de sincronización entre One Star (E-commerce) y Loggro Pymes (ERP). Todo agente que modifique la integración o sincronización de productos debe seguir estas reglas.

## 1. El Problema: Modelos de Datos Incompatibles
Loggro usa un modelo de datos "plano", mientras que One Star usa un modelo "jerárquico".
- **Loggro:** Cada combinación de talla/color es un **Item** independiente con su propio SKU.
- **One Star:** Un **Producto** padre contiene múltiples **Variantes** (Talla/Color).

## 2. La Solución Arquitectónica: Agrupación por Prefijo de SKU
Para evitar llenar la tienda de productos repetidos y mantener a Loggro como única fuente de verdad, implementamos un agrupador inteligente en `src/server/services/erp-sync.service.ts`:

- **Regla de SKU:** El SKU (Código en Loggro) debe estructurarse separando el identificador del producto padre y la variante con un guión (`-`).
- **Ejemplo Loggro:** `CAM01-M-ROJ`
- **Comportamiento en One Star:**
  1. Corta el SKU en el primer guión: `CAM01`.
  2. Busca o crea el **Producto Padre** con slug `CAM01`.
  3. Usa el resto del sufijo (`M-ROJ`) para determinar la Talla y Color de la **Variante**, y la inserta dentro del padre.
- Si el SKU de Loggro no tiene guiones (Ej: `ZAPATOS`), se asume que es un producto único y se le asigna la variante "Única".

## 3. Preservación de Datos de One Star
El proceso de *Upsert* es seguro. Al sincronizar con Loggro, el código actualiza:
- Precio Base
- Unidad de Medida
- Stock de la Variante
- Vinculación `erpId`

**NUNCA SOBRESCRIBE:**
- Imágenes subidas en el administrador web.
- Descripciones enriquecidas.
- Categorías web (asigna "Sin Categoría" por defecto solo a los productos nuevos).
- Posiciones en el Hero Banner o Grillas.

## 4. Reglas Estrictas de Modificación (Arquitectura Agnóstica)
- El acceso a Loggro se hace **únicamente** a través del adaptador `src/server/erp/adapters/loggro.adapter.ts`.
- La lógica de negocio NO debe importar `LoggroClient` directamente. Se debe inyectar a través de la interfaz genérica `IERPAdapter`.
- Las mutaciones de base de datos de productos ocurren en `erp-sync.service.ts` y no en el adaptador.
