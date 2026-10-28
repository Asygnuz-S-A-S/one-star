import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany } from "@/server/services/store-settings.service"
import CookiePreferencesManager from "@/components/legal/CookiePreferencesManager"

export const metadata: Metadata = {
  title: "Política de Cookies | One Star",
  description:
    "Información sobre el uso de cookies y tecnologías de seguimiento en la tienda en línea de One Star, y gestión de preferencias de consentimiento.",
}

export default async function CookiesPage() {
  const company = await getLegalCompany()

  return (
    <LegalDocument
      title="Política de Cookies y Tecnologías de Seguimiento"
      intro={`En ${company.tradeName} valoramos tu privacidad. Esta política explica de forma clara y transparente qué son las cookies, qué tipos utilizamos en nuestra tienda en línea y cómo puedes administrarlas o revocar tu consentimiento en cualquier momento.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
    >
      <div className="mb-8">
        <CookiePreferencesManager />
      </div>

      <LegalSection id="que-son" heading="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo (computador, teléfono móvil o tableta) cuando los visitas. Se utilizan ampliamente para permitir que los sitios funcionen de manera eficiente, recordar tus preferencias, mantener los productos en tu carrito de compras y proporcionar información a los propietarios del sitio.
        </p>
      </LegalSection>

      <LegalSection id="tipos" heading="2. Categorías de cookies que utilizamos">
        <p>
          En Tienda One Star agrupamos las cookies en dos categorías esenciales:
        </p>
        <LegalList
          items={[
            "Cookies estrictamente necesarias (técnicas): Son indispensables para que puedas navegar por la tienda y utilizar sus funciones esenciales, como mantener tu sesión iniciada, recordar los artículos agregados a tu bolsa de compra y prevenir fraudes o ataques de seguridad (CSRF). Estas cookies no recopilan información con fines publicitarios y no pueden ser desactivadas en nuestros sistemas.",
            "Cookies de analítica y medición (Google Analytics 4): Nos permiten contar las visitas, fuentes de tráfico y páginas más populares para medir y mejorar el rendimiento de nuestro sitio web. Toda la información se recopila de forma agregada y anónima. Solo se activan si otorgas tu consentimiento previo.",
            "Cookies de publicidad y redes sociales (Meta Pixel): Son utilizadas por nosotros y por Meta Platforms para comprender el impacto de nuestras campañas publicitarias, medir eventos comerciales (como visitas o compras) y mostrarte anuncios relevantes en plataformas como Facebook e Instagram. Solo se activan si otorgas tu consentimiento previo.",
          ]}
        />
      </LegalSection>

      <LegalSection id="consent-mode" heading="3. Consent Mode y bloqueo previo">
        <p>
          En cumplimiento de la Ley 1581 de 2012 y de las mejores prácticas internacionales de privacidad digital, <strong>nuestra tienda no carga herramientas de seguimiento de analítica ni de publicidad antes de que aceptes su uso</strong>.
        </p>
        <p>
          Si seleccionas &ldquo;Rechazar opcionales&rdquo;, el Meta Pixel y Google Analytics permanecerán totalmente inactivos en tu navegador, garantizando que únicamente operen las cookies técnicas necesarias para procesar tus pedidos.
        </p>
      </LegalSection>

      <LegalSection id="administracion" heading="4. Cómo administrar o eliminar cookies en tu navegador">
        <p>
          Además del panel de preferencias interactivo ubicado al inicio de esta página, puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones del navegador que utilices:
        </p>
        <LegalList
          items={[
            "Google Chrome: Configuración > Privacidad y seguridad > Cookies y otros datos de sitios.",
            "Mozilla Firefox: Opciones > Privacidad y seguridad > Cookies y datos del sitio.",
            "Apple Safari: Preferencias > Privacidad > Bloquear todas las cookies.",
            "Microsoft Edge: Configuración > Permisos de sitios > Cookies y datos del sitio.",
          ]}
        />
        <p className="mt-2 text-xs">
          Ten en cuenta que si bloqueas todas las cookies desde el navegador (incluidas las técnicas necesarias), algunas áreas o funcionalidades de la tienda podrían no operar correctamente.
        </p>
      </LegalSection>

      <LegalSection id="contacto" heading="5. Consultas sobre privacidad y cookies">
        <p>
          Para cualquier inquietud sobre nuestra Política de Cookies o sobre el tratamiento de tus datos personales, puedes radicar tu solicitud en nuestro canal de{" "}
          <Link href="/pqrs" className="text-[#E31C23] underline underline-offset-2">
            PQRS (Habeas Data)
          </Link>{" "}
          o consultar nuestra{" "}
          <Link href="/privacidad" className="text-[#E31C23] underline underline-offset-2">
            Política de Tratamiento de Datos Personales
          </Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
