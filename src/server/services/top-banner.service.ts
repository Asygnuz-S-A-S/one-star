import "server-only"

import * as repository from "@/server/repositories/top-banner.repository"
import { TopBannerInputSchema, type TopBannerInput } from "@/server/validators/top-banner.validator"

export async function getTopBanner() {
  return repository.getTopBanner()
}

export async function updateTopBanner(input: TopBannerInput) {
  const data = TopBannerInputSchema.parse(input)
  const messages = data.messages.map(message => ({
    text: message.text,
    ...(message.url ? { url: message.url } : {}),
  }))

  return repository.updateTopBanner({
    ...data,
    text: messages[0]?.text || data.text || "",
    btnText: data.btnText || null,
    btnUrl: data.btnUrl || null,
    messages,
  })
}
