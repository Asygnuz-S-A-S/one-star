import type { Metadata } from "next"
import Link from "next/link"
import { verifyCustomerPasswordResetToken } from "@/server/services/customer-recovery.service"
import ResetForm from "./ResetForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Nueva contraseña | One Star",
  robots: { index: false, follow: false },
}

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const token = (await searchParams).token ?? ""
  const verification = await verifyCustomerPasswordResetToken(token)

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-8 py-10">
        <h1 className="font-barlow font-bold text-xl tracking-wide text-[#1C1C1C] uppercase text-center">
          Nueva contraseña
        </h1>
        {verification.valid && verification.email ? (
          <ResetForm token={token} email={verification.email} />
        ) : (
          <div className="mt-6 space-y-6 text-center">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left font-montserrat text-sm text-amber-900" role="alert">
              {verification.error}
            </p>
            <Link href="/recuperar-contrasena" className="font-montserrat text-sm font-semibold text-[#E31C23] hover:underline">
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
