import type { Metadata } from "next"
import Link from "next/link"
import RecoveryForm from "./RecoveryForm"

export const metadata: Metadata = {
  title: "Recuperar contraseña | One Star",
  robots: { index: false },
}

export default function RecuperarContrasenaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-sm">
        <h1 className="mb-6 text-center font-barlow text-xl font-bold uppercase tracking-wide text-[#1C1C1C]">
          Recuperar contraseña
        </h1>
        <RecoveryForm />
        <p className="mt-6 text-center">
          <Link href="/login" className="inline-flex min-h-11 items-center font-montserrat text-sm text-[#4A4A4A] underline underline-offset-2">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
