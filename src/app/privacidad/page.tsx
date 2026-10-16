import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_COMPANY, LEGAL_LAST_UPDATED } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Política de Privacidad | One Star",
  description:
    "Política de tratamiento de datos personales de One Star conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015.",
}

const responsable = LEGAL_COMPANY.legalName ?? LEGAL_COMPANY.tradeName
const canalContacto =
  LEGAL_COMPANY.contactEmail ?? "los canales de atención publicados en este sitio"

export default function PrivacidadPage() {
  return (
    <LegalDocument
      title="Política de Privacidad"
      intro={`Esta política describe cómo ${LEGAL_COMPANY.tradeName} recolecta, usa, almacena y protege tus datos personales, conforme a la Ley 1581 de 2012, el Decreto 1074 de 2015 y demás normas concordantes.`}
      lastUpdated={LEGAL_LAST_UPDATED}
    >
      <LegalSection id="responsable" heading="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de tus datos personales es {responsable}
          {LEGAL_COMPANY.taxId ? `, NIT ${LEGAL_COMPANY.taxId}` : ""}
          {LEGAL_COMPANY.address ? `, con domicilio en ${LEGAL_COMPANY.address}` : ""}. Puedes
          comunicarte con nosotros en {canalContacto}
          {LEGAL_COMPANY.contactPhone ? ` o al ${LEGAL_COMPANY.contactPhone}` : ""}.
        </p>
      </LegalSection>

      <LegalSection id="datos" heading="2. Datos que recolectamos">
        <LegalList
          items={[
            "Datos de identificación y contacto: nombre, apellido, documento de identidad, correo electrónico, teléfono y fecha de nacimiento.",
            "Datos de entrega y facturación: dirección, ciudad, departamento y código postal.",
            "Datos de la relación comercial: pedidos, productos consultados, marcas de preferencia, reseñas y solicitudes de servicio.",
            "Datos técnicos de navegación: dirección IP, tipo de dispositivo y navegador, y páginas visitadas.",
            "No solicitamos ni almacenamos el número completo de tu tarjeta ni su código de seguridad: esos datos los captura y custodia directamente la pasarela de pagos.",
          ]}
        />
      </LegalSection>

      <LegalSection id="finalidades" heading="3. Finalidades del tratamiento">
        <LegalList
          items={[
            "Gestionar el registro, la autenticación y la administración de tu cuenta.",
            "Procesar, despachar y hacer seguimiento a tus pedidos, incluyendo la facturación correspondiente.",
            "Atender peticiones, quejas, reclamos, cambios, devoluciones y solicitudes de garantía.",
            "Enviar comunicaciones transaccionales sobre el estado de tus compras.",
            "Enviar comunicaciones comerciales y promocionales, únicamente si has dado tu autorización, que puedes retirar en cualquier momento.",
            "Cumplir obligaciones legales, contables y tributarias, y atender requerimientos de autoridades competentes.",
            "Mejorar la experiencia de compra mediante análisis estadísticos agregados.",
          ]}
        />
      </LegalSection>

      <LegalSection id="autorizacion" heading="4. Autorización">
        <p>
          Recolectamos tu autorización previa, expresa e informada al momento del registro, de la
          compra o de la suscripción a nuestras comunicaciones. La autorización para finalidades
          comerciales es opcional y separable de las finalidades necesarias para ejecutar la
          relación contractual.
        </p>
      </LegalSection>

      <LegalSection id="derechos" heading="5. Tus derechos como titular">
        <LegalList
          items={[
            "Conocer, actualizar y rectificar tus datos personales.",
            "Solicitar prueba de la autorización otorgada, salvo en los casos exceptuados por la ley.",
            "Ser informado sobre el uso que se ha dado a tus datos.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la normativa.",
            "Revocar la autorización y solicitar la supresión de tus datos, cuando no exista un deber legal o contractual que exija conservarlos.",
            "Acceder de forma gratuita a los datos que hayan sido objeto de tratamiento.",
          ]}
        />
      </LegalSection>

      <LegalSection id="procedimiento" heading="6. Cómo ejercer tus derechos">
        <p>
          Envía tu solicitud a {canalContacto} indicando tu nombre, documento de identidad, el
          derecho que deseas ejercer y los hechos que lo sustentan. Las consultas se atienden en un
          plazo máximo de diez (10) días hábiles y los reclamos en un plazo máximo de quince (15)
          días hábiles, prorrogables en los términos de ley.
        </p>
      </LegalSection>

      <LegalSection id="terceros" heading="7. Encargados y transferencia de datos">
        <p>
          Para operar la tienda compartimos datos con proveedores que actúan como encargados del
          tratamiento y que solo pueden usarlos para prestarnos el servicio contratado:
        </p>
        <LegalList
          items={[
            "Pasarela de pagos, para procesar y validar las transacciones.",
            "Operadores logísticos, para entregar los pedidos.",
            "Proveedores de infraestructura, alojamiento y base de datos.",
            "Proveedor de correo transaccional, para enviarte confirmaciones y notificaciones.",
            "Proveedor de almacenamiento de imágenes del catálogo.",
            "Sistema de gestión empresarial (ERP), para la administración de inventario y facturación.",
            "Herramientas de monitoreo de errores, que procesan datos técnicos de diagnóstico.",
          ]}
        />
        <p>
          Algunos de estos proveedores pueden estar ubicados fuera de Colombia. En esos casos se
          adoptan las garantías exigidas por la normativa colombiana para la transferencia
          internacional de datos.
        </p>
      </LegalSection>

      <LegalSection id="conservacion" heading="8. Conservación">
        <p>
          Conservamos tus datos mientras exista una relación comercial vigente y, terminada esta,
          durante los plazos exigidos por las normas comerciales, contables y tributarias
          aplicables. Cumplidos esos plazos, los datos se suprimen o se anonimizan.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" heading="9. Seguridad de la información">
        <p>
          Aplicamos medidas técnicas, humanas y administrativas razonables para proteger tus datos
          contra pérdida, acceso no autorizado, alteración o divulgación: cifrado en tránsito,
          almacenamiento de contraseñas mediante funciones de hash, control de acceso por roles y
          registro de actividad administrativa.
        </p>
      </LegalSection>

      <LegalSection id="cookies" heading="10. Cookies y tecnologías similares">
        <p>
          Usamos cookies y almacenamiento local del navegador para mantener tu sesión iniciada,
          conservar el contenido del carrito y recordar tus preferencias de navegación. Puedes
          bloquearlas o eliminarlas desde la configuración de tu navegador, teniendo en cuenta que
          algunas funciones de la tienda dejarán de operar correctamente.
        </p>
      </LegalSection>

      <LegalSection id="menores" heading="11. Datos de menores de edad">
        <p>
          La tienda no está dirigida a menores de edad. El tratamiento de datos de niñas, niños y
          adolescentes solo procede cuando responde a su interés superior, se respeta su derecho a
          ser escuchados y media la autorización de su representante legal.
        </p>
      </LegalSection>

      <LegalSection id="cambios" heading="12. Cambios en esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios normativos u operativos. La versión
          vigente es siempre la publicada en esta página, con su fecha de actualización. Los{" "}
          <Link href="/terminos" className="text-[#E31C23] underline underline-offset-2">
            Términos y Condiciones
          </Link>{" "}
          complementan lo aquí dispuesto.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
