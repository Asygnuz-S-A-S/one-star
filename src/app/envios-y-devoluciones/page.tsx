import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Políticas de Envío y Devoluciones | One Star",
  description:
    "Conoce nuestros plazos de entrega en Colombia, costos de envío, condiciones de cambios por talla y política de devoluciones y garantías.",
}

const canalContacto =
  LEGAL_COMPANY.contactEmail ?? "contacto@tiendaonestar.com"

export default function EnviosYDevolucionesPage() {
  return (
    <LegalDocument
      title="Políticas de Envío y Devoluciones"
      intro="En One Star nos aseguramos de que recibas tus zapatillas y prendas de forma rápida, segura y transparente en cualquier lugar de Colombia. Aquí te explicamos cómo funcionan nuestros envíos, cambios y garantías."
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <LegalSection id="cobertura-y-tiempos" heading="1. Cobertura y plazos de entrega">
        <p>
          Realizamos envíos a toda Colombia a través de transportadoras nacionales reconocidas
          (como Envía y Servientrega).
        </p>
        <LegalList
          items={[
            "Ciudades principales (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga, Pereira, Manizales): entrega estimada entre 3 y 5 días hábiles.",
            "Resto del país y trayectos especiales: entre 5 y 8 días hábiles dependiendo de la localidad.",
            "Los pedidos realizados durante fines de semana o días festivos se procesan a partir del siguiente día hábil.",
            "Una vez despachado tu pedido, recibirás por correo electrónico el número de guía para realizar el seguimiento en tiempo real.",
          ]}
        />
      </LegalSection>

      <LegalSection id="costos-de-envio" heading="2. Costos de envío">
        <LegalList
          items={[
            "Envío gratis: aplica automáticamente en compras iguales o superiores a $200.000 COP a nivel nacional.",
            "Pedidos inferiores a $200.000 COP: tarifa estándar de $15.000 COP por despacho.",
            "El valor exacto del envío se desglosa en la pantalla de checkout antes de realizar el pago.",
          ]}
        />
      </LegalSection>

      <LegalSection id="cambios" heading="3. Cambios por talla o modelo">
        <p>
          Queremos que tus tenis te queden perfectos. Si necesitas cambiar la talla o referencia:
        </p>
        <LegalList
          items={[
            "Plazo: dispones de hasta 30 días calendario a partir de la fecha de entrega del pedido.",
            "Condiciones del calzado: el producto debe estar sin uso, limpio, sin desgaste en la suela y conservando su caja original, etiquetas y accesorios.",
            "Primer cambio de talla: el costo del flete de recolección y nuevo envío es asumido por One Star.",
            "Para solicitar un cambio, escribe a nuestro WhatsApp oficial o al correo " + canalContacto + " con tu número de pedido y la talla requerida.",
          ]}
        />
      </LegalSection>

      <LegalSection id="retracto-y-devoluciones" heading="4. Derecho de retracto y devoluciones">
        <p>
          Conforme al artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor de Colombia), tienes derecho a retractarte de tu compra:
        </p>
        <LegalList
          items={[
            "Plazo de retracto: máximo 5 días hábiles contados a partir de la entrega del producto.",
            "Condición: el producto debe devolverse en el mismo estado en que fue recibido, sin haber sido usado y en su empaque original.",
            "Reembolso: una vez recibido y verificado el producto en nuestras bodegas, se procederá al reembolso del 100% del dinero pagado en un plazo no mayor a 30 días calendario por el mismo medio de pago utilizado o mediante transferencia bancaria acordada.",
          ]}
        />
      </LegalSection>

      <LegalSection id="garantia" heading="5. Garantía legal por calidad">
        <p>
          Todos nuestros productos son 100% originales de marcas autorizadas y cuentan con garantía legal:
        </p>
        <LegalList
          items={[
            "Cobertura de 90 días calendario ante defectos de fabricación, despegue de suela no atribuible a mal uso o rotura anormal de costuras.",
            "No cubre desgaste natural por uso habitual, lavado indebido, raspaduras por superficies abrasivas o daños causados por terceros.",
            "Ante una reclamación por garantía, nuestro equipo técnico evalúa el producto y, de ser procedente, se realiza la reparación, sustitución por un par nuevo o devolución del dinero.",
          ]}
        />
      </LegalSection>

      <LegalSection id="contacto" heading="6. Canales de atención">
        <p>
          Para gestionar envíos, cambios o devoluciones, comunícate con nosotros:
        </p>
        <LegalList
          items={[
            <span key="email">Correo electrónico: <a href={`mailto:${canalContacto}`} className="text-[#E31C23] underline">{canalContacto}</a></span>,
            <span key="whatsapp">WhatsApp de soporte: disponible en el botón de chat de nuestra tienda en línea.</span>,
            <span key="horario">Horario de atención: lunes a sábado de 9:00 a.m. a 7:00 p.m.</span>,
          ]}
        />
        <p className="mt-4 text-xs text-[#4A4A4A] dark:text-white/50">
          Para conocer las condiciones generales de compra y privacidad, consulta nuestros{" "}
          <Link href="/terminos" className="text-[#E31C23] underline">
            Términos y Condiciones
          </Link>{" "}
          y nuestra{" "}
          <Link href="/privacidad" className="text-[#E31C23] underline">
            Política de Tratamiento de Datos
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
