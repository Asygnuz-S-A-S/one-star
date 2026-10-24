import GiftCardPurchase from "@/components/gift-card/GiftCardPurchase"
import { getGiftCardOptions } from "@/server/services/gift-card.service"

export const metadata = {
  title: "Tarjeta de Regalo | One Star",
  description: "Regala el estilo perfecto con la tarjeta de regalo One Star.",
}

export default async function TarjetaRegaloPage() {
  const options = await getGiftCardOptions()

  return (
    <div className="store-section store-gutter mx-auto max-w-6xl">
      <GiftCardPurchase
        options={options}
        intro={
          <div>
            <p className="store-eyebrow mb-3">Regala One Star</p>
            <h1 className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.03em] text-[#1C1C1C] sm:text-5xl dark:text-white">
              Tarjeta de regalo
            </h1>
            <p className="mt-4 max-w-md font-montserrat text-base text-[#4A4A4A] dark:text-gray-300">
              ¿No sabes qué regalar? Con nuestra tarjeta de regalo virtual, esa persona especial podrá elegir
              exactamente lo que quiere. Se envía por correo inmediatamente después de la compra y es válida por 12 meses.
            </p>
          </div>
        }
      />
    </div>
  )
}
