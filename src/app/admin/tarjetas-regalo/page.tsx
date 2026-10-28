import GiftCardDesk from "./GiftCardDesk"
import { requireSuperAdmin } from "@/server/auth/require-admin"
import { listRecentGiftCards } from "@/server/services/gift-card.service"

export const dynamic = "force-dynamic"

export default async function TarjetasRegaloPage() {
  await requireSuperAdmin()
  const cards = await listRecentGiftCards()
  return <GiftCardDesk cards={cards} />
}
