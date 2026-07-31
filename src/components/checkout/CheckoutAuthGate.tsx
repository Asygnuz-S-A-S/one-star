import Link from "next/link"

const LOGIN_URL = "/login?callbackUrl=%2Fcheckout"
const REGISTER_URL = "/registro?callbackUrl=%2Fcheckout"

function CheckoutSilhouette() {
  return (
    <div
      className="grid w-full grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      aria-hidden="true"
    >
      <div className="space-y-5">
        <div className="h-52 rounded-xl bg-white shadow-sm" />
        <div className="h-64 rounded-xl bg-white shadow-sm" />
        <div className="h-36 rounded-xl bg-white shadow-sm" />
      </div>
      <div className="h-80 rounded-xl bg-white shadow-sm" />
    </div>
  )
}

interface CheckoutAuthGateProps {
  isPending?: boolean
  draftPersistenceFailed?: boolean
}

export default function CheckoutAuthGate({
  isPending = false,
  draftPersistenceFailed = false,
}: CheckoutAuthGateProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#F5F5F5] px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-barlow text-2xl font-bold tracking-tight text-[#1C1C1C]"
          >
            ONE STAR
          </Link>
        </div>

        <section
          className="relative"
          aria-busy={isPending}
          aria-live="polite"
          aria-labelledby="checkout-auth-title"
        >
          <div className={isPending ? "animate-pulse" : "opacity-40 blur-[1px]"}>
            <CheckoutSilhouette />
          </div>

          {isPending ? (
            <h1 id="checkout-auth-title" className="sr-only">
              Verificando tu sesión
            </h1>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center py-6">
              <div className="mx-auto w-full max-w-lg rounded-2xl border border-[#E0E0E0] bg-white px-6 py-8 text-center shadow-xl sm:px-10">
                <div
                  className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#E31C23]/10 text-[#E31C23]"
                  aria-hidden="true"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="m17 11 2 2 4-4" />
                  </svg>
                </div>
                <h1
                  id="checkout-auth-title"
                  className="font-barlow text-2xl font-bold uppercase tracking-wide text-[#1C1C1C]"
                >
                  Inicia sesión para pagar
                </h1>
                <p className="mx-auto mt-3 max-w-md font-montserrat text-sm leading-6 text-[#4A4A4A]">
                  Tu cuenta protege los datos del pedido y te permite consultar el estado de tu compra.
                </p>
                {draftPersistenceFailed && (
                  <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-montserrat text-xs leading-5 text-amber-800">
                    Tu navegador no permitió conservar el formulario. Al volver del inicio de sesión tendrás que diligenciarlo nuevamente.
                  </p>
                )}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={LOGIN_URL}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-[#E31C23] px-5 py-3 font-barlow text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c41920] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31C23]"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href={REGISTER_URL}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-[#1C1C1C] px-5 py-3 font-barlow text-sm font-bold uppercase tracking-wider text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1C1C]"
                  >
                    Crear cuenta
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
