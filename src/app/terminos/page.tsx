import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany, getLegalDocuments } from "@/server/services/store-settings.service"

export const metadata: Metadata = {
  title: "Términos y Condiciones | One Star",
  description:
    "Términos y condiciones de uso y de compra en la tienda en línea de One Star, conforme al Estatuto del Consumidor colombiano.",
}

export default async function TerminosPage() {
  const [company, documents] = await Promise.all([getLegalCompany(), getLegalDocuments()])
  const responsable = company.legalName ?? company.tradeName
  const canalContacto = company.contactEmail ?? "los canales de atención publicados en este sitio"

  return (
    <LegalDocument
      title="Términos y Condiciones"
      intro={`Estos términos regulan el uso de la tienda en línea de ${company.tradeName} y las compras que se realicen a través de ella. Al navegar o comprar en el sitio, aceptas lo aquí descrito.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
      documentUrl={documents.terms}
    >
      <LegalSection id="identificacion" heading="1. Identificación del proveedor">
        <p>
          La tienda en línea es operada por {responsable}
          {company.taxId ? `, NIT ${company.taxId}` : ""}
          {company.address ? `, con domicilio en ${company.address}` : ""}
          {company.city ? `, ${company.city}` : ""}
          {company.commercialRegistry ? `, matrícula mercantil ${company.commercialRegistry}` : ""}. Para
          cualquier solicitud, petición o reclamo puedes escribir a {canalContacto}
          {company.contactPhone ? ` o llamar al ${company.contactPhone}` : ""}
          {company.dataProtectionEmail ? `. Para datos personales: ${company.dataProtectionEmail}` : ""}.
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
            "Puedes comprar como invitado o crear una cuenta. Para compras como invitado, solicitamos los datos de facturación y despacho necesarios para procesar el pedido y emitir el comprobante correspondiente.",
            "Al comprar como invitado y tras la confirmación de pago aprobado, recibirás por correo electrónico una invitación con un enlace de un solo uso para crear tu contraseña y activar tu cuenta; al verificarlo, se vincularán tus pedidos a tu perfil.",
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
            "Antes de finalizar y pagar, es obligatorio aceptar expresamente estos términos y condiciones y autorizar el tratamiento de datos personales.",
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
            "Emisión y valor: Las tarjetas de regalo se emiten por el valor adquirido en pesos colombianos (COP) tras la confirmación del pago correspondiente.",
            "Vigencia: Tienen una vigencia de doce (12) meses contados a partir de su fecha de emisión y entrega digital, salvo que se estipule expresamente un plazo superior.",
            "No reembolsables: Las tarjetas de regalo no son canjeables ni reembolsables total ni parcialmente por dinero en efectivo, transferencias ni cheques.",
            "Condiciones de uso: Pueden ser redimidas exclusivamente para la compra de productos disponibles en la tienda en línea y en las tiendas físicas de One Star. El saldo puede utilizarse en una o varias transacciones hasta agotar su valor total o hasta el vencimiento de su vigencia. Si el valor de la compra excede el saldo de la tarjeta de regalo, el comprador deberá pagar el excedente a través de cualquiera de los demás medios de pago aceptados.",
            "Custodia del código: El código alfanumérico enviado al correo electrónico constituye el único instrumento para redimir el saldo. El comprador o beneficiario es el único responsable de su custodia; One Star no responderá por saldos ya utilizados por terceros debido a pérdida o divulgación no autorizada del código.",
          ]}
        />
      </LegalSection>

      <LegalSection id="one-star-club" heading="11. One Star Club">
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3.5 text-xs font-montserrat text-amber-900 dark:text-amber-200">
          <strong>Aviso:</strong> Pendiente del reglamento oficial de One Star. Las condiciones particulares y definitivas del programa One Star Club se publicarán y actualizarán una vez sean formalizadas por One Star.
        </div>
        <LegalList
          items={[
            "Naturaleza del programa: One Star Club es un programa de fidelización voluntario y gratuito para clientes de la tienda.",
            "Beneficios: Da acceso a promociones exclusivas, cupones para miembros, lanzamientos prioritarios y comunicaciones especiales.",
            "Retiro voluntario: El miembro puede darse de baja del programa o revocar su autorización para recibir novedades en cualquier momento desde su perfil de usuario o a través de nuestros canales de atención.",
          ]}
        />
      </LegalSection>

      <LegalSection id="financiacion-terceros" heading="12. Financiación con Addi y Sistecrédito">
        <LegalList
          items={[
            "Proveedores independientes: One Star pone a disposición de sus clientes métodos de pago a crédito financiados por terceros especializados e independientes: Adelante Soluciones Financieras S.A.S. (Addi) y Sistecrédito S.A.S. (Sistecrédito).",
            "Términos propios del crédito: La relación crediticia, estudio de crédito, aprobación, tasas de interés, número de cuotas, cobro de avales y políticas de cobranza se rigen de manera exclusiva por los términos y condiciones y contratos celebrados directamente entre el cliente y Addi o Sistecrédito.",
            "Independencia de One Star: One Star no actúa como entidad financiera, otorgante del crédito ni fiador, y no interviene ni se responsabiliza por la aprobación o rechazo de las solicitudes de crédito.",
            "Reclamaciones sobre el crédito: Cualquier duda, consulta o inconformidad sobre cobros de cuotas, intereses o estados de cuenta crediticios debe ser dirigida directamente a los canales de atención de Addi o Sistecrédito según corresponda.",
          ]}
        />
      </LegalSection>

      <LegalSection id="propiedad" heading="13. Propiedad intelectual">
        <p>
          Las marcas, logotipos, textos, fotografías, diseños y demás contenidos del sitio son
          propiedad de {responsable} o de sus titulares legítimos y están protegidos por la
          normativa de propiedad industrial y derechos de autor. No se autoriza su reproducción,
          distribución ni uso comercial sin autorización previa y escrita.
        </p>
      </LegalSection>

      <LegalSection id="uso" heading="14. Uso permitido del sitio">
        <LegalList
          items={[
            "No está permitido interferir con el funcionamiento del sitio, realizar extracción automatizada de datos ni intentar acceder a áreas restringidas.",
            "Las opiniones y reseñas publicadas por los usuarios deben ser veraces y respetuosas; podemos retirar contenido que resulte ofensivo, engañoso o ilegal.",
          ]}
        />
      </LegalSection>

      <LegalSection id="responsabilidad" heading="15. Limitación de responsabilidad">
        <p>
          Hacemos nuestro mejor esfuerzo para mantener el sitio disponible y la información
          actualizada, pero no garantizamos la ausencia de interrupciones, errores u omisiones. Esta
          limitación no excluye ni reduce las responsabilidades que la ley colombiana impone de
          manera imperativa al proveedor frente al consumidor.
        </p>
      </LegalSection>

      <LegalSection id="ley" heading="16. Ley aplicable y solución de controversias">
        <p>
          Estos términos se rigen por la ley colombiana. Cualquier controversia se tramitará ante
          las autoridades competentes de Colombia, sin perjuicio de las facultades jurisdiccionales
          de la Superintendencia de Industria y Comercio en materia de protección al consumidor o
          a través de nuestro canal de{" "}
          <Link href="/pqrs" className="text-[#E31C23] underline underline-offset-2">
            PQRS
          </Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
