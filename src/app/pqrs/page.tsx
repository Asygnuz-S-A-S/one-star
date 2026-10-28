import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany } from "@/server/services/store-settings.service"
import PqrsForm from "@/components/legal/PqrsForm"

export const metadata: Metadata = {
  title: "Canal de Derechos (PQRS y Habeas Data) | One Star",
  description:
    "Formulario oficial para la radicación de consultas, reclamos, solicitudes de supresión y revocatoria de publicidad conforme a la Ley 1581 de 2012.",
}

export default async function PqrsPage() {
  const company = await getLegalCompany()
  const dataEmail = company.dataProtectionEmail ?? company.contactEmail ?? "contacto@tiendaonestar.com"

  return (
    <LegalDocument
      title="Canal de Derechos de los Titulares (PQRS)"
      intro={`En cumplimiento del artículo 15 de la Constitución Política de Colombia, la Ley 1581 de 2012 y la Ley 2300 de 2023, ${company.tradeName} pone a tu disposición este canal oficial para radicar consultas, reclamos, rectificaciones y solicitudes de exclusión publicitaria.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
    >
      <LegalSection id="formulario" heading="Radicación de solicitud en línea">
        <p className="text-sm font-montserrat text-[#4A4A4A] dark:text-white/70 mb-4">
          Diligencia el siguiente formulario para obtener tu número oficial de radicado. Recibirás una confirmación inmediata por correo electrónico y el área encargada responderá formalmente dentro de los plazos de ley.
        </p>
        <div className="rounded-xl border border-[#E0E0E0] dark:border-white/10 bg-white dark:bg-[#151515] p-5 md:p-8 shadow-sm">
          <PqrsForm />
        </div>
      </LegalSection>

      <LegalSection id="plazos" heading="Términos legales de atención">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          <div className="rounded-lg border border-[#E0E0E0] dark:border-white/10 bg-[#FAFAFA] dark:bg-white/5 p-4">
            <h4 className="font-barlow font-bold text-sm uppercase text-[#1C1C1C] dark:text-white">
              Consultas (10 días hábiles)
            </h4>
            <p className="mt-1 font-montserrat text-xs text-[#4A4A4A] dark:text-white/70 leading-relaxed">
              Solicitudes para conocer la información personal que reposa en nuestras bases de datos. Prorrogable hasta por 5 días hábiles si existen causas justificadas informadas al titular.
            </p>
          </div>
          <div className="rounded-lg border border-[#E0E0E0] dark:border-white/10 bg-[#FAFAFA] dark:bg-white/5 p-4">
            <h4 className="font-barlow font-bold text-sm uppercase text-[#1C1C1C] dark:text-white">
              Reclamos y Supresión (15 días hábiles)
            </h4>
            <p className="mt-1 font-montserrat text-xs text-[#4A4A4A] dark:text-white/70 leading-relaxed">
              Solicitudes de corrección, actualización, supresión de datos o retiro de autorización para comunicaciones comerciales. Prorrogable hasta por 8 días hábiles informando previamente al titular.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection id="canales-alternativos" heading="Otros canales de atención">
        <p className="text-sm font-montserrat text-[#4A4A4A] dark:text-white/70">
          Si prefieres radicar tu solicitud por otro medio, puedes escribir directamente a nuestro correo de protección de datos:{" "}
          <a href={`mailto:${dataEmail}`} className="text-[#E31C23] font-semibold underline underline-offset-2">
            {dataEmail}
          </a>
          {company.contactPhone ? ` o a través de nuestra línea de WhatsApp ${company.contactPhone}` : ""}. Consulta los detalles completos en nuestra{" "}
          <Link href="/privacidad" className="text-[#E31C23] underline underline-offset-2">
            Política de Privacidad
          </Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
