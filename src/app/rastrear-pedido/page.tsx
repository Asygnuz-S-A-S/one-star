import type { Metadata } from "next"
import TrackOrderForm from "./TrackOrderForm"

export const metadata: Metadata = {
  title: "Rastrear mi pedido | One Star",
  description: "Consulta el estado de tu pedido One Star con el número de pedido y el correo de la compra.",
  alternates: { canonical: "/rastrear-pedido" },
}

export default async function RastrearPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string | string[] }>
}) {
  const { pedido } = await searchParams
  const initialNumber = typeof pedido === "string" ? pedido.slice(0, 12) : ""
  return <TrackOrderForm initialNumber={initialNumber} />
}
