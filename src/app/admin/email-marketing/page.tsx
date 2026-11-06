import type { Metadata } from "next"
import { requireAdmin } from "@/server/auth/require-admin"
import { countBySegment, getMarketingAudience } from "@/server/services/marketing.service"
import { listEmailTemplatesForAdmin } from "@/server/services/email-settings.service"
import EmailMarketingPanel from "@/components/admin/EmailMarketingPanel"

export const metadata: Metadata = {
  title: "Email marketing | Admin One Star",
}

export const dynamic = "force-dynamic"

export default async function AdminEmailMarketingPage() {
  const session = await requireAdmin()
  const [audience, templates] = await Promise.all([getMarketingAudience(), listEmailTemplatesForAdmin()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-tight text-[#1C1C1C] md:text-3xl">
          Email marketing
        </h1>
        <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">
          Audiencia con consentimiento para campañas en Resend y textos de los correos automáticos de la tienda.
        </p>
      </div>

      <EmailMarketingPanel
        totalContacts={audience.length}
        segments={countBySegment(audience)}
        templates={templates}
        adminEmail={session.user.email}
        resendConfigured={Boolean(process.env.RESEND_API_KEY)}
        webhookConfigured={Boolean(process.env.RESEND_WEBHOOK_SECRET)}
        senderAddress={process.env.EMAIL_FROM ?? ""}
      />
    </div>
  )
}
