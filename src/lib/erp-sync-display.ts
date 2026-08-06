export interface ErpSyncCountLike {
  processedCount: number
  productCount?: number
  variantCount?: number
}

export interface ErpErrorPresentation {
  title: string
  explanation: string
  action: string
}

/** Traduce fallos técnicos conocidos a una explicación accionable para administración. */
export function getErpErrorPresentation(error: string | null | undefined): ErpErrorPresentation {
  if (!error) {
    return {
      title: "La sincronización falló",
      explanation: "El ERP no entregó un detalle adicional.",
      action: "Usa “Probar endpoints” para revisar conexión, catálogo e inventario por separado.",
    }
  }

  const normalized = error.toLocaleLowerCase("es")

  if (
    normalized.includes("stock total en cero") ||
    (normalized.includes("inventario") && normalized.includes("en cero"))
  ) {
    return {
      title: "El inventario del ERP llegó en cero",
      explanation:
        "La API puede estar respondiendo correctamente, pero el ERP informó cero unidades para todos los SKU consultados. La web conservó el inventario existente.",
      action:
        "Revisa las existencias y la asignación de bodegas en el ERP; después ejecuta “Probar endpoints” antes de volver a sincronizar.",
    }
  }

  if (normalized.includes("stock fue parcial") || normalized.includes("stock es desconocido")) {
    return {
      title: "La consulta de inventario quedó incompleta",
      explanation:
        "No fue posible obtener una respuesta válida para todos los SKU, por lo que la web evitó reemplazar existencias con datos parciales.",
      action: "Comprueba las bodegas, los SKU faltantes y el endpoint de disponibilidad del ERP.",
    }
  }

  if (normalized.includes("devolvió 0 productos") || normalized.includes("catálogo vacío")) {
    return {
      title: "El ERP no devolvió productos",
      explanation: "La conexión puede estar activa aunque el endpoint de catálogo no entregue registros.",
      action: "Verifica los permisos del token y que existan productos visibles para la integración.",
    }
  }

  if (normalized.includes("escrituras del catálogo están pausadas")) {
    return {
      title: "Las actualizaciones del catálogo están pausadas",
      explanation: "La lectura terminó, pero la protección de escrituras impidió aplicar cambios en la web.",
      action: "Mantén la protección activa hasta aprobar la calidad de los datos recibidos del ERP.",
    }
  }

  if (normalized.includes("ya hay una sincronización")) {
    return {
      title: "Ya hay una sincronización en curso",
      explanation: "Se evitó iniciar un segundo proceso mientras el anterior sigue trabajando.",
      action: "Espera a que termine y actualiza esta página antes de intentarlo nuevamente.",
    }
  }

  return {
    title: "La sincronización falló",
    explanation: error,
    action: "Usa “Probar endpoints” y comparte este detalle con soporte si el problema continúa.",
  }
}

/** Evita presentar los ítems planos históricos de Loggro como productos web. */
export function formatErpSyncCount(value: ErpSyncCountLike): string {
  if (value.productCount != null && value.variantCount != null) {
    return `${value.productCount} productos · ${value.variantCount} variantes`
  }
  return `${value.processedCount} registros ERP`
}
