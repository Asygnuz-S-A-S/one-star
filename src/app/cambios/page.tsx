import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany, getLegalDocuments } from "@/server/services/store-settings.service"

export const metadata: Metadata = {
  title: "Cambios y devoluciones | One Star",
  description: "Política de cambios, devoluciones y garantía de One Star.",
}

export default async function CambiosPage() {
  const [company, documents] = await Promise.all([getLegalCompany(), getLegalDocuments()])

  return (
    <LegalDocument
      title="Cambios y devoluciones"
      intro="Aquí está la política de cambios, garantía y devoluciones de la tienda."
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
      documentUrl={documents.returns}
    >
      <LegalSection id="cambios" heading="Política vigente">
        <p>
          Mientras no haya un documento cargado, los cambios y la garantía se explican en los{" "}
          <Link href="/terminos#garantia" className="text-[#E31C23] underline underline-offset-2">
            términos y condiciones
          </Link>
          . El plazo que ves en la ficha del producto es el que aplica a esa compra.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
