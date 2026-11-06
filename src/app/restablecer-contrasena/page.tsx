import type { Metadata } from "next"
import Link from "next/link"
import { verifyCustomerPasswordResetToken } from "@/server/services/customer-recovery.service"
import ResetForm from "./ResetForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Nueva contraseña | One Star",
  robots: { index: false },
}

export default async function RestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const token = (await searchParams).token ?? ""
  const verification = await verifyCustomerPasswordResetToken(token)

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-center font-barlow text-xl font-bold uppercase tracking-wide text-[#1C1C1C]">
          Crear nueva contraseña
        </h1>
        {verification.valid && verification.email ? (
          <ResetForm token={token} email={verification.email} />
        ) : (
          <div className="flex flex-col gap-4">
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-montserrat text-sm text-amber-900">
              {verification.error}
            </p>
            <Link
              href="/recuperar-contrasena"
              className="w-full rounded-lg bg-[#1C1C1C] py-3.5 text-center font-barlow text-sm font-bold uppercase tracking-widest text-white"
            >
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
