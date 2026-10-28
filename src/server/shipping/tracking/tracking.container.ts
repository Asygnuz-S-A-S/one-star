import "server-only"

import type { IShippingTrackingPort } from "./ports/shipping-tracking.port"
import { EnviaShippingTrackingAdapter } from "./adapters/envia.adapter"
import { NullShippingTrackingAdapter } from "./adapters/null.adapter"

let _enviaAdapter: EnviaShippingTrackingAdapter | null = null
let _nullAdapter: NullShippingTrackingAdapter | null = null

export function getShippingTrackingAdapter(carrier?: string | null): IShippingTrackingPort {
  const normalizedCarrier = (carrier ?? "ENVIA").toUpperCase().trim()

  if (normalizedCarrier === "ENVIA") {
    if (!_enviaAdapter) {
      _enviaAdapter = new EnviaShippingTrackingAdapter()
    }
    return _enviaAdapter
  }

  if (!_nullAdapter) {
    _nullAdapter = new NullShippingTrackingAdapter()
  }
  return _nullAdapter
}

export function resetShippingTrackingAdapter(): void {
  _enviaAdapter = null
  _nullAdapter = null
}
