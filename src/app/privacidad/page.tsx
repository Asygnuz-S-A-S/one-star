import type { Metadata } from "next"
import Link from "next/link"
import LegalDocument, { LegalList, LegalSection } from "@/components/legal/LegalDocument"
import { LEGAL_LAST_UPDATED } from "@/lib/legal"
import { getLegalCompany, getLegalDocuments } from "@/server/services/store-settings.service"

export const metadata: Metadata = {
  title: "Política de Tratamiento de Datos Personales | One Star",
  description:
    "Política de tratamiento de datos personales de Tienda One Star v2.0, conforme a la Ley 1581 de 2012, el Decreto 1074 de 2015 y la Ley 2300 de 2023.",
}

function fieldOrPending(value: string | null | undefined, label: string): string {
  return value?.trim() ? value.trim() : `[${label} pendiente de confirmación]`
}

export default async function PrivacidadPage() {
  const [company, documents] = await Promise.all([getLegalCompany(), getLegalDocuments()])
  const nombreResponsable = fieldOrPending(company.legalName, "Nombre del responsable")
  const nitResponsable = fieldOrPending(company.taxId, "NIT")
  const direccionResponsable = fieldOrPending(company.address, "Dirección para notificaciones")
  const ciudadResponsable = company.city?.trim() || "Manizales, Caldas, Colombia"
  const correoResponsable = fieldOrPending(company.contactEmail, "Correo electrónico")
  const telefonoResponsable = fieldOrPending(company.contactPhone, "Teléfono y WhatsApp")
  const correoProteccionDatos = fieldOrPending(
    company.dataProtectionEmail ?? company.contactEmail,
    "Correo de protección de datos"
  )

  return (
    <LegalDocument
      title="Política de Tratamiento de Datos Personales"
      intro={`Tienda One Star — Versión 2.0. La presente política establece las condiciones para la recolección, almacenamiento, uso, circulación, actualización, transmisión, transferencia y supresión de datos personales tratados por Tienda One Star en sus actividades comerciales, administrativas, laborales y operativas.`}
      lastUpdated={LEGAL_LAST_UPDATED}
      company={company}
      documentUrl={documents.privacy}
    >
      <LegalSection id="responsable" heading="1. Identificación del responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos personales recolectados y tratados en el desarrollo de las actividades comerciales de Tienda One Star es:
        </p>
        <LegalList
          items={[
            `Nombre o razón social: ${nombreResponsable}.`,
            "Calidad: Persona natural responsable del tratamiento de datos personales.",
            `NIT: ${nitResponsable}.`,
            `Dirección para notificaciones: ${direccionResponsable}.`,
            `Ciudad: ${ciudadResponsable}.`,
            `Correo electrónico: ${correoResponsable}.`,
            `Teléfono y WhatsApp: ${telefonoResponsable}.`,
            "Página web: www.tiendaonestar.com.",
            "Área encargada de la gestión interna: Administración.",
            `Correo para atención de datos personales: ${correoProteccionDatos}.`,
          ]}
        />
        <p>
          Para efectos de esta política, se denominará a este responsable &ldquo;Tienda One Star&rdquo; o &ldquo;el Responsable&rdquo;. La gestión interna de las solicitudes relacionadas con datos personales estará a cargo del área de Administración, bajo la supervisión del Responsable.
        </p>
      </LegalSection>

      <LegalSection id="objetivo" heading="2. Objetivo">
        <p>
          La presente política establece las condiciones para la recolección, almacenamiento, uso, circulación, actualización, transmisión, transferencia y supresión de datos personales tratados por Tienda One Star. Su finalidad es garantizar el respeto por los derechos de los titulares, establecer reglas transparentes para el tratamiento de la información y definir responsabilidades y procedimientos para el cumplimiento de la normativa colombiana sobre protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection id="alcance" heading="3. Alcance">
        <p>
          Esta política aplica a los datos personales tratados por Tienda One Star en sus actividades comerciales, administrativas, laborales y operativas, tanto en establecimientos físicos como a través de canales digitales. Comprende, entre otros:
        </p>
        <LegalList
          items={[
            "Clientes actuales y potenciales.",
            "Compradores de las tiendas físicas y de la página web.",
            "Usuarios que se comunican por WhatsApp, Instagram, Facebook, correo electrónico u otros canales.",
            "Participantes en concursos, sorteos, promociones, campañas y programas de fidelización (One Star Club).",
            "Empleados, aspirantes a vacantes, exempleados y beneficiarios.",
            "Proveedores, contratistas y sus representantes o contactos.",
            "Visitantes de los puntos de venta y personas captadas por sistemas de videovigilancia.",
            "Personas que presentan consultas, peticiones, quejas, reclamos o solicitudes relacionadas con los productos y servicios.",
          ]}
        />
        <p>
          La política será aplicable independientemente del medio por el cual se recolecten los datos, siempre que se encuentren dentro de su ámbito legal de aplicación.
        </p>
      </LegalSection>

      <LegalSection id="marco-normativo" heading="4. Marco normativo">
        <p>
          Esta política se interpreta y aplica de acuerdo con la legislación colombiana vigente, especialmente:
        </p>
        <LegalList
          items={[
            "Constitución Política de Colombia, artículo 15.",
            "Ley Estatutaria 1581 de 2012, régimen general de protección de datos personales.",
            "Decreto 1074 de 2015, en las disposiciones aplicables al tratamiento de datos personales, incluidas las normas reglamentarias incorporadas.",
            "Ley 1266 de 2008, cuando corresponda por la naturaleza de la información y el tratamiento.",
            "Ley 2300 de 2023, en lo aplicable a los mensajes comerciales y publicitarios y a la protección de la intimidad de los consumidores.",
            "Las demás normas que modifiquen, complementen o sustituyan las anteriores.",
          ]}
        />
      </LegalSection>

      <LegalSection id="definiciones" heading="5. Definiciones">
        <LegalList
          items={[
            "Dato personal: Información que permite identificar o hacer identificable a una persona natural.",
            "Titular: Persona natural a quien pertenecen los datos personales.",
            "Tratamiento: Operación realizada sobre datos personales, como recolección, almacenamiento, consulta, utilización, circulación, actualización, transmisión o supresión.",
            "Responsable del tratamiento: Persona que decide sobre la base de datos o las finalidades y condiciones de su tratamiento.",
            "Encargado del tratamiento: Persona natural o jurídica que trata datos personales por cuenta del Responsable.",
            "Autorización: Consentimiento previo, expreso e informado del titular, obtenido por un medio que permita su consulta posterior, salvo los casos en que la ley no lo exija.",
            "Dato sensible: Información cuyo uso indebido puede afectar la intimidad o generar discriminación. Incluye, entre otros, datos de salud y datos biométricos.",
            "Dato biométrico: Información obtenida a partir de características físicas, fisiológicas o conductuales que permiten o pueden permitir la identificación de una persona.",
            "Base de datos: Conjunto organizado de datos personales sometido a tratamiento.",
            "Aviso de privacidad: Comunicación mediante la cual se informa al titular sobre la existencia de la política de tratamiento y las condiciones esenciales del tratamiento.",
            "Transmisión de datos: Comunicación de datos a un encargado para que los trate por cuenta del Responsable.",
            "Transferencia de datos: Comunicación de datos a otro responsable que decide sobre su propio tratamiento.",
            "Supresión: Eliminación de los datos personales cuando corresponda, teniendo en cuenta las obligaciones legales de conservación y las excepciones aplicables.",
          ]}
        />
      </LegalSection>

      <LegalSection id="principios" heading="6. Principios del tratamiento">
        <p>
          Tienda One Star aplicará los siguientes principios en todo tratamiento de datos:
        </p>
        <LegalList
          items={[
            "Legalidad: El tratamiento se realizará conforme a la legislación vigente.",
            "Finalidad: Los datos serán tratados para propósitos legítimos, específicos e informados.",
            "Libertad: Se solicitará autorización previa, expresa e informada cuando sea legalmente exigible.",
            "Veracidad y calidad: La información deberá ser veraz, completa, exacta, actualizada, comprobable y comprensible.",
            "Transparencia: Se permitirá al titular conocer la existencia y el uso de sus datos.",
            "Acceso y circulación restringida: El acceso se limitará a las personas y destinatarios autorizados.",
            "Seguridad: Se adoptarán medidas técnicas, humanas y administrativas razonables para proteger la información.",
            "Confidencialidad: Quienes intervengan en el tratamiento deberán preservar la reserva de la información.",
            "Responsabilidad demostrada: El Responsable procurará demostrar el cumplimiento de sus obligaciones mediante procedimientos, registros y evidencias.",
          ]}
        />
      </LegalSection>

      <LegalSection id="categorias" heading="7. Categorías de datos personales tratados">
        <p>
          Dependiendo de la relación con el titular y de los servicios o procesos involucrados, Tienda One Star podrá tratar las siguientes categorías de información:
        </p>
        <LegalList
          items={[
            "Clientes y compradores: Nombres y apellidos, tipo y número de documento de identificación, teléfono, correo electrónico, dirección de entrega, información para facturación y obligaciones tributarias, fecha de nacimiento (cuando aplique a beneficios autorizados), historial de compras, pedidos, cambios, garantías y solicitudes de servicio.",
            "Usuarios de canales digitales: Datos proporcionados a través de la página web, WhatsApp Business, Instagram, Facebook, correo electrónico y otros canales de atención, incluyendo consultas, solicitudes, preferencias y antecedentes de conversación.",
            "Fidelización, publicidad y promociones: Datos de contacto, historial de compras, preferencias conocidas, participación en campañas y fecha de nacimiento para el programa de fidelización y segmentación de comunicaciones, condicionados a autorización específica.",
            "Empleados, aspirantes y exempleados: Hojas de vida, identificación, contacto, experiencia laboral, formación, referencias, información contractual, nómina, pagos, cuentas bancarias, seguridad social, beneficiarios, salud ocupacional (SST), registros de asistencia y datos biométricos cuando exista finalidad legítima.",
            "Proveedores y terceros: Datos de identificación, contacto, información bancaria y tributaria, documentos comerciales, datos de representantes o contactos autorizados y referencias comerciales.",
            "Visitantes y videovigilancia: Grabaciones de imágenes y videos captados por cámaras de seguridad en establecimientos físicos para fines de seguridad y control.",
            "Participantes en concursos y campañas: Datos necesarios para administrar concursos, sorteos, promociones comerciales, bonos y actividades promocionales.",
          ]}
        />
      </LegalSection>

      <LegalSection id="finalidades" heading="8. Finalidades del tratamiento">
        <LegalList
          items={[
            "Gestión comercial y atención al cliente: Gestionar ventas en tiendas físicas y canales digitales; facturación y obligaciones tributarias; procesamiento de pedidos, pagos, entregas, cambios, devoluciones y garantías; atención de requerimientos posventa; coordinación con transportadoras; y prevención de fraudes.",
            "Mercadeo, publicidad y fidelización (con autorización previa y separada): Enviar información sobre nuevos productos, lanzamientos, promociones y beneficios; contactar por WhatsApp, correo electrónico o SMS; administrar el programa One Star Club, puntos y bonos; segmentar ofertas por fecha de nacimiento o historial; y gestionar campañas publicitarias mediante Meta Ads y Google Ads conforme a las plataformas.",
            "Gestión laboral: Adelantar procesos de selección, contratación, administración de nómina, prestaciones, seguridad social, seguridad y salud en el trabajo, registros de asistencia y cumplimiento de deberes laborales.",
            "Gestión de proveedores: Evaluación, vinculación, control de pagos, seguimiento contractual y obligaciones contables y tributarias.",
            "Seguridad física y videovigilancia: Proteger clientes, empleados, visitantes, instalaciones, inventario y bienes; documentar situaciones de seguridad y atender requerimientos legales de autoridades.",
            "Obligaciones legales y defensa de derechos: Atender requerimientos de autoridades competentes, conservar documentos durante los plazos de ley y ejercer la defensa jurídica del Responsable.",
          ]}
        />
        <p className="mt-3 font-semibold text-[#1C1C1C] dark:text-white">
          Diferenciación estricta de finalidades: La participación en una compra, el ingreso a una tienda o la entrega de datos para facturación no implican por sí solos autorización para recibir publicidad. La autorización para mercadeo es opcional y separable; negarse a recibir publicidad no impedirá adquirir productos ni acceder a los servicios.
        </p>
      </LegalSection>

      <LegalSection id="autorizacion" heading="9. Autorización para el tratamiento">
        <p>
          Cuando la ley exija autorización, Tienda One Star la solicitará antes de iniciar el tratamiento correspondiente y conservará prueba consultable de su obtención por medios físicos o electrónicos.
        </p>
        <p>
          La solicitud informa siempre la identidad del Responsable, las finalidades del tratamiento, los derechos del titular, los canales de atención y el carácter facultativo de responder preguntas sobre datos sensibles o de menores de edad. La autorización comercial y publicitaria se solicita siempre de manera diferenciada e independiente de la indispensable para ejecutar la compra.
        </p>
      </LegalSection>

      <LegalSection id="sensibles-menores" heading="10 y 11. Datos sensibles y datos de menores de edad">
        <p>
          <strong>Datos sensibles:</strong> Tienda One Star dará tratamiento a datos sensibles únicamente cuando exista autorización expresa y fundada en las excepciones de ley. Antes de recolectarlos se informará el carácter facultativo de su entrega. En ningún caso se condicionará una compra o promoción a la entrega de datos sensibles innecesarios.
        </p>
        <p className="mt-2">
          <strong>Niños, niñas y adolescentes:</strong> La tienda no está dirigida a menores de edad. Solo se tratarán datos de menores cuando exista finalidad legítima, interés superior, respeto de sus derechos fundamentales y la previa autorización otorgada por su representante legal, escuchando la opinión del menor según su madurez.
        </p>
      </LegalSection>

      <LegalSection id="proveedores" heading="12. Canales, sistemas y proveedores que intervienen en el tratamiento">
        <p>
          De acuerdo con la operación informada, intervienen los siguientes sistemas y proveedores como encargados o responsables independientes en lo que a cada uno compete:
        </p>
        <LegalList
          items={[
            "Página web: Desarrollo propio mediante Next.js.",
            "Facturación e inventario: Mekano.",
            "CRM: Mekano; implementación futura de Clientify (pendiente de validación).",
            "Mensajería y atención directa: WhatsApp Business.",
            "Publicidad digital: Meta Ads y Google Ads.",
            "Comunicaciones comerciales: Email marketing y SMS masivos.",
            "Dominio y servicios tecnológicos: GoDaddy.",
            "Correo electrónico: Gmail / Google Workspace.",
            "Almacenamiento del sistema comercial: Software Mekano (propiedad de Apolosoft, alojado en nube; razón social y ubicación de alojamiento pendientes de confirmación técnica).",
            "Pagos en línea y enlaces de pago: ePayco.",
            "Pagos en puntos físicos: Credibanco.",
            "Financiación al consumo: Addi y Sistecrédito (entidades terceras independientes con términos y políticas propias).",
            "Control de horarios mediante huella (laboral): Proware HS SAS.",
          ]}
        />
        <p>
          Los datos compartidos con cada proveedor se limitan estrictamente a lo necesario para la prestación del servicio contratado bajo acuerdos de confidencialidad y seguridad.
        </p>
      </LegalSection>

      <LegalSection id="transmision" heading="13. Transmisión y transferencia nacional o internacional">
        <p>
          Al utilizar servicios de nube, correo, mensajería, pasarelas de pago y analítica digital, puede presentarse almacenamiento o tratamiento de información fuera de Colombia. Tienda One Star verifica que las transmisiones a encargados y transferencias a responsables cuenten con un nivel adecuado de protección o las garantías legales exigidas por la normativa colombiana de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection id="cookies" heading="14. Cookies, publicidad digital y audiencias">
        <p>
          La página web utiliza cookies técnicas necesarias para el funcionamiento de la tienda (mantener la sesión, el carrito de compras y la seguridad). Las herramientas de analítica (Google Analytics 4) y seguimiento publicitario (Meta Pixel) operan bajo el mecanismo de Consent Mode y <strong>no se cargan ni recopilan datos hasta que el usuario otorgue su consentimiento previo y expreso</strong> a través del banner de cookies o del panel de preferencias en{" "}
          <Link href="/cookies" className="text-[#E31C23] underline underline-offset-2">
            /cookies
          </Link>.
        </p>
      </LegalSection>

      <LegalSection id="comunicaciones" heading="15. Comunicaciones comerciales y derecho a dejar de recibir publicidad">
        <p>
          Tienda One Star enviará comunicaciones comerciales únicamente a los titulares que hayan otorgado su consentimiento expreso, respetando los horarios y disposiciones de la Ley 2300 de 2023.
        </p>
        <p>
          Todo mensaje comercial por correo electrónico incluirá un enlace visible y gratuito para darse de baja inmediatamente. Asimismo, el titular puede revocar su consentimiento en cualquier momento a través del formulario de{" "}
          <Link href="/pqrs" className="text-[#E31C23] underline underline-offset-2">
            PQRS
          </Link>{" "}
          o escribiendo a {correoProteccionDatos}.
        </p>
      </LegalSection>

      <LegalSection id="videovigilancia" heading="16. Videovigilancia en puntos de venta">
        <p>
          En las tiendas físicas se utilizan cámaras de seguridad para la protección de personas, bienes e instalaciones. En los accesos a cada sede existen avisos de privacidad visibles. Las grabaciones se conservan por un periodo de entre 15 y 60 días según la capacidad técnica de cada punto, salvo cuando deban preservarse como evidencia probatoria ante incidentes o requerimientos judiciales.
        </p>
      </LegalSection>

      <LegalSection id="derechos" heading="17. Derechos de los titulares">
        <LegalList
          items={[
            "Conocer, actualizar y rectificar sus datos personales frente a Tienda One Star o los encargados.",
            "Solicitar prueba de la autorización otorgada, salvo cuando la ley la exceptúe.",
            "Ser informado, previa solicitud, respecto del uso que se ha dado a sus datos personales.",
            "Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley, agotado el trámite ante el Responsable.",
            "Revocar la autorización y/o solicitar la supresión del dato cuando en el tratamiento no se respeten los principios, derechos y garantías constitucionales y legales.",
            "Acceder en forma gratuita a sus datos personales que hayan sido objeto de tratamiento.",
            "Abstenerse de autorizar el tratamiento de datos sensibles o de menores de edad.",
          ]}
        />
      </LegalSection>

      <LegalSection id="procedimiento" heading="18. Procedimiento para consultas y reclamos (Habeas Data)">
        <p>
          Los titulares o sus causahabientes pueden radicar sus solicitudes a través de nuestro canal web oficial en{" "}
          <Link href="/pqrs" className="text-[#E31C23] underline underline-offset-2">
            /pqrs
          </Link>
          , al correo {correoProteccionDatos}, al WhatsApp {telefonoResponsable} o en la sede física en {direccionResponsable}, {ciudadResponsable}.
        </p>
        <p>
          <strong>Consultas (plazo de 10 días hábiles):</strong> Serán atendidas en un término máximo de diez (10) días hábiles contados a partir de la fecha de su recibo. Si no fuere posible resolverla en dicho plazo, se informará al interesado antes del vencimiento expresando los motivos de la demora y señalando la fecha en que se atenderá, la cual en ningún caso podrá superar los cinco (5) días hábiles siguientes al vencimiento del primer término.
        </p>
        <p>
          <strong>Reclamos, supresión o corrección (plazo de 15 días hábiles):</strong> Serán atendidos en un término máximo de quince (15) días hábiles contados a partir del día siguiente a la fecha de su recibo. Cuando no fuere posible resolver el reclamo dentro de dicho término, se informará al interesado los motivos y la fecha de respuesta, que no podrá superar los ocho (8) días hábiles siguientes al vencimiento del primer término.
        </p>
        <p>
          Si el reclamo resulta incompleto, se requerirá al interesado dentro de los cinco (5) días siguientes a la recepción para que subsane las fallas. Transcurridos dos (2) meses sin respuesta, se entenderá que ha desistido del reclamo.
        </p>
      </LegalSection>

      <LegalSection id="seguridad-incidentes" heading="19 y 20. Seguridad de la información e incidentes">
        <p>
          Tienda One Star adopta medidas técnicas, administrativas y humanas para prevenir la pérdida, adulteración, consulta, uso o acceso no autorizado a los datos personales, incluyendo cifrado en tránsito, almacenamiento seguro de contraseñas mediante funciones de hash, control de acceso por roles y registros de auditoría. Se cuenta con un procedimiento interno de gestión y documentación de incidentes de seguridad para su oportuna contención y reporte ante la autoridad competente cuando la ley lo exija.
        </p>
      </LegalSection>

      <LegalSection id="conservacion" heading="21. Conservación, archivo y supresión de datos">
        <p>
          Los datos personales se conservarán únicamente durante el tiempo necesario para cumplir las finalidades informadas y los deberes legales, comerciales, contables, tributarios y probatorios aplicables. Cumplidas dichas finalidades y plazos legales, se procederá a su supresión segura o anonimización, conservando únicamente los registros mínimos indispensables para asegurar la efectividad del derecho de oposición publicitaria.
        </p>
      </LegalSection>

      <LegalSection id="responsabilidades" heading="22. Responsabilidades internas">
        <p>
          El Responsable aprueba esta política y supervisa su cumplimiento. El área de Administración coordina la recepción, registro y respuesta de consultas y reclamos de los titulares, la custodia de autorizaciones, el seguimiento de proveedores y la capacitación interna en materia de protección de datos personales.
        </p>
      </LegalSection>

      <LegalSection id="rnbd" heading="23. Registro Nacional de Bases de Datos (RNBD)">
        <p>
          Tienda One Star verifica y cumple con las disposiciones legales aplicables a la inscripción de bases de datos ante el Registro Nacional de Bases de Datos (RNBD) administrado por la Superintendencia de Industria y Comercio, según los criterios de aplicabilidad legal vigentes para personas naturales.
        </p>
      </LegalSection>

      <LegalSection id="vigencia" heading="24. Vigencia y actualización">
        <p>
          La presente Política de Tratamiento de Datos Personales rige a partir del <strong>20 de octubre de 2026</strong> (Versión 2.0). Cualquier modificación sustancial en las finalidades o condiciones del tratamiento será comunicada oportunamente a los titulares a través de los canales digitales y requerirá una nueva autorización previa cuando la normativa legal así lo disponga.
        </p>
      </LegalSection>
    </LegalDocument>
  )
}
