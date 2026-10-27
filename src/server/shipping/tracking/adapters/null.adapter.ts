import "server-only"

import type { IShippingTrackingPort, TrackingEvent } from "../ports/shipping-tracking.port"

export class NullShippingTrackingAdapter implements IShippingTrackingPort {
  async getTracking(_guia: string): Promise<TrackingEvent | null> {
    void _guia
    return null
  }

  buildTrackingUrl(guia: string): string | null {
    if (!guia) return null
    const template =
      process.env.ENVIA_TRACKING_URL_TEMPLATE ?? "https://envia.co/rastreo?guia={guia}"
    return template.replace("{guia}", encodeURIComponent(guia.trim()))
  }
}
