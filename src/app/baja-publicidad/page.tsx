import type { Metadata } from "next"
import LegalDocument from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany } from "@/server/services/store-settings.service"
import { verifyUnsubscribeToken } from "@/server/services/unsubscribe.service"
import UnsubscribeCard from "@/components/legal/UnsubscribeCard"

export const metadata: Metadata = {
  title: "Baja de Comunicaciones Comerciales | One Star",
  description: "Canal oficial para cancelar la recepción de mensajes comerciales y de mercadeo conforme a la Ley 2300 de 2023.",
}

export default async function BajaPublicidadPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const [company, params] = await Promise.all([getLegalCompany(), searchParams])
  const verifiedEmail = params.token ? verifyUnsubscribeToken(params.token) : null

  return (
    <LegalDocument
      title="Baja de Comunicaciones Comerciales"
      intro={`En ${company.tradeName} respetamos tu decisión. Si no deseas continuar recibiendo información sobre novedades, ofertas o lanzamientos, confirma tu correo a continuación.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
    >
      <div className="max-w-xl mx-auto my-6">
        <UnsubscribeCard
          initialToken={params.token}
          initialEmail={verifiedEmail ?? params.email}
        />
      </div>
    </LegalDocument>
  )
}
