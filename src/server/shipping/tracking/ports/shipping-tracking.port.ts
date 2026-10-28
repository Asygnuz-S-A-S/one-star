import "server-only"

export interface TrackingEvent {
  state: string
  lastEvent: string
  city: string
  at: string
}

export interface IShippingTrackingPort {
  getTracking(guia: string): Promise<TrackingEvent | null>
  buildTrackingUrl(guia: string): string | null
}
