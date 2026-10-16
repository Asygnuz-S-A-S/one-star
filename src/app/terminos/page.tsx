import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Términos y Condiciones | One Star",
  description:
    "Términos y condiciones de uso y de compra en la tienda en línea de One Star, conforme al Estatuto del Consumidor colombiano.",
}

const responsable = LEGAL_COMPANY.legalName ?? LEGAL_COMPANY.tradeName
const canalContacto =
  LEGAL_COMPANY.contactEmail ?? "los canales de atención publicados en este sitio"

export default function TerminosPage() {
  return (
    <LegalDocument
      title="Términos y Condiciones"
      intro={`Estos términos regulan el uso de la tienda en línea de ${LEGAL_COMPANY.tradeName} y las compras que se realicen a través de ella. Al navegar o comprar en el sitio, aceptas lo aquí descrito.`}
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <LegalSection id="identificacion" heading="1. Identificación del proveedor">
        <p>
          La tienda en línea es operada por {responsable}
          {LEGAL_COMPANY.taxId ? `, NIT ${LEGAL_COMPANY.taxId}` : ""}
          {LEGAL_COMPANY.address ? `, con domicilio en ${LEGAL_COMPANY.address}` : ""}. Para
          cualquier solicitud, petición o reclamo puedes escribir a {canalContacto}
          {LEGAL_COMPANY.contactPhone ? ` o llamar al ${LEGAL_COMPANY.contactPhone}` : ""}.
        </p>
      </LegalSection>

      <LegalSection id="alcance" heading="2. Alcance y aceptación">
        <p>
          El uso del sitio implica la aceptación plena de estos términos y de la{" "}
          <Link href="/privacidad" className="text-[#E31C23] underline underline-offset-2">
            Política de Tratamiento de Datos Personales
          </Link>
          . Si no estás de acuerdo, abstente de usar la tienda. Podemos actualizar estos términos en
          cualquier momento; la versión vigente es la publicada en esta página, con su fecha de
          actualización.
        </p>
      </LegalSection>

      <LegalSection id="cuenta" heading="3. Registro y cuenta de usuario">
        <LegalList
          items={[
            "Puedes comprar como invitado o crear una cuenta. La información que registres debe ser veraz, completa y actualizada.",
            "Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.",
            "Podemos suspender o cancelar cuentas que incumplan estos términos, que registren datos falsos o que se usen con fines fraudulentos.",
          ]}
        />
      </LegalSection>

      <LegalSection id="productos" heading="4. Productos, precios y disponibilidad">
        <LegalList
          items={[
            "Todos los precios se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique lo contrario.",
            "La disponibilidad se muestra según el inventario al momento de la consulta y puede variar hasta el momento de confirmar el pedido.",
            "Las imágenes son ilustrativas; pueden existir diferencias de tono o presentación frente al producto físico.",
            "Si detectamos un error evidente en el precio o en la descripción de un producto, te contactaremos antes de despachar el pedido y podrás confirmarlo al precio correcto o cancelarlo con reembolso total.",
          ]}
        />
      </LegalSection>

      <LegalSection id="compra" heading="5. Proceso de compra y pago">
        <LegalList
          items={[
            "El pedido se perfecciona cuando el pago es aprobado por la pasarela y recibes la confirmación por correo electrónico.",
            "Los pagos se procesan a través de pasarelas autorizadas; no almacenamos los datos completos de tu medio de pago.",
            "Nos reservamos el derecho de rechazar o cancelar un pedido cuando existan indicios de fraude, imposibilidad de verificar la identidad del comprador o falta de inventario, con reembolso íntegro del valor pagado.",
          ]}
        />
      </LegalSection>

      <LegalSection id="envios" heading="6. Envíos y entregas">
        <LegalList
          items={[
            "El costo y el tiempo de envío se informan antes de finalizar la compra y dependen de la ciudad de destino y del método seleccionado.",
            "Los tiempos de entrega son estimados en días hábiles y empiezan a contarse desde la confirmación del pago.",
            "Es tu responsabilidad suministrar una dirección de entrega correcta y completa. Los reenvíos causados por datos errados pueden generar un costo adicional.",
          ]}
        />
      </LegalSection>

      <LegalSection id="retracto" heading="7. Derecho de retracto">
        <p>
          Conforme al artículo 47 de la Ley 1480 de 2011, en las ventas realizadas por medios
          electrónicos puedes ejercer el derecho de retracto dentro de los cinco (5) días hábiles
          siguientes a la entrega del producto. Para ejercerlo, comunícate a {canalContacto} y
          devuelve el producto en las mismas condiciones en que lo recibiste, sin uso, con sus
          etiquetas y empaque original. Devolveremos el dinero en un plazo máximo de treinta (30)
          días calendario; los costos de transporte del retracto corren por cuenta del consumidor.
        </p>
      </LegalSection>

      <LegalSection id="reversion" heading="8. Reversión del pago">
        <p>
          De acuerdo con el artículo 51 de la Ley 1480 de 2011, puedes solicitar la reversión del
          pago cuando seas víctima de fraude, cuando el producto no corresponda a lo solicitado,
          cuando sea defectuoso o cuando no te sea entregado. La solicitud debe presentarse dentro
          de los cinco (5) días hábiles siguientes a que tengas conocimiento del hecho, ante
          nosotros y ante el emisor de tu medio de pago.
        </p>
      </LegalSection>

      <LegalSection id="garantia" heading="9. Garantía legal, cambios y devoluciones">
        <LegalList
          items={[
            "Todos los productos cuentan con la garantía legal prevista en el Estatuto del Consumidor por defectos de fabricación o de calidad.",
            "La garantía no cubre el desgaste natural por el uso, ni los daños causados por uso indebido, alteraciones o mantenimiento inadecuado.",
            "Los cambios por talla están sujetos a disponibilidad de inventario y a que el producto no haya sido usado.",
            `Para iniciar un cambio, una devolución o una reclamación de garantía, escribe a ${canalContacto} con el número de pedido.`,
          ]}
        />
      </LegalSection>

      <LegalSection id="tarjeta-regalo" heading="10. Tarjetas de regalo">
        <LegalList
          items={[
            "Las tarjetas de regalo se emiten por el valor adquirido, en pesos colombianos, y no son canjeables por dinero en efectivo.",
            "Su vigencia y sus condiciones de uso se informan al momento de la compra y en el mensaje de entrega.",
          ]}
        />
      </LegalSection>

      <LegalSection id="propiedad" heading="11. Propiedad intelectual">
        <p>
          Las marcas, logotipos, textos, fotografías, diseños y demás contenidos del sitio son
          propiedad de {responsable} o de sus titulares legítimos y están protegidos por la
          normativa de propiedad industrial y derechos de autor. No se autoriza su reproducción,
          distribución ni uso comercial sin autorización previa y escrita.
        </p>
      </LegalSection>

      <LegalSection id="uso" heading="12. Uso permitido del sitio">
        <LegalList
          items={[
            "No está permitido interferir con el funcionamiento del sitio, realizar extracción automatizada de datos ni intentar acceder a áreas restringidas.",
            "Las opiniones y reseñas publicadas por los usuarios deben ser veraces y respetuosas; podemos retirar contenido que resulte ofensivo, engañoso o ilegal.",
          ]}
        />
      </LegalSection>

      <LegalSection id="responsabilidad" heading="13. Limitación de responsabilidad">
        <p>
          Hacemos nuestro mejor esfuerzo para mantener el sitio disponible y la información
          actualizada, pero no garantizamos la ausencia de interrupciones, errores u omisiones. Esta
          limitación no excluye ni reduce las responsabilidades que la ley colombiana impone de
          manera imperativa al proveedor frente al consumidor.
        </p>
      </LegalSection>

      <LegalSection id="ley" heading="14. Ley aplicable y solución de controversias">
        <p>
          Estos términos se rigen por la ley colombiana. Cualquier controversia se tramitará ante
          las autoridades competentes de Colombia, sin perjuicio de las facultades jurisdiccionales
          de la Superintendencia de Industria y Comercio en materia de protección al consumidor.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
