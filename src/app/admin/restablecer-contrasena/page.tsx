import Link from "next/link"
import { verifyAdminPasswordResetToken } from "@/server/services/admin-recovery.service"
import ResetPasswordForm from "./ResetPasswordForm"

export const dynamic = "force-dynamic"

export default async function AdminRestablecerContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token ?? ""
  const verification = await verifyAdminPasswordResetToken(token)

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1C1C] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <p className="font-barlow font-bold text-3xl tracking-widest text-[#1C1C1C]">
            ONE STAR
          </p>
          <p className="font-montserrat text-xs text-[#4A4A4A] mt-1 uppercase tracking-wider">
            Restablecer Contraseña
          </p>
        </div>

        {!verification.valid ? (
          <div className="space-y-4 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left" data-testid="invalid-token-box">
              <p className="font-montserrat text-xs font-semibold text-amber-900 mb-1">
                Enlace no válido o expirado
              </p>
              <p className="font-montserrat text-xs text-amber-800 leading-relaxed">
                {verification.error ?? "El enlace de recuperación es inválido, ha expirado o ya ha sido utilizado."}
              </p>
            </div>
            <Link
              href="/admin/login"
              className="inline-block w-full bg-[#1C1C1C] hover:bg-[#333333] text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg py-3 transition-colors text-center"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <ResetPasswordForm token={token} email={verification.email!} />
        )}
      </div>
    </div>
  )
}
