import "server-only"

export type { IShippingTrackingPort, TrackingEvent } from "./ports/shipping-tracking.port"
export { EnviaShippingTrackingAdapter } from "./adapters/envia.adapter"
export { NullShippingTrackingAdapter } from "./adapters/null.adapter"
export {
  getShippingTrackingAdapter,
  resetShippingTrackingAdapter,
} from "./tracking.container"
