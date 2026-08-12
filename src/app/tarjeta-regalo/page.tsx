import React from "react"
import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Tarjeta de Regalo | One Star",
  description: "Regala el estilo perfecto con la tarjeta de regalo One Star.",
}

export default function TarjetaRegaloPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto bg-white shadow-xl overflow-hidden rounded-lg">
        <div className="grid md:grid-cols-2">
          {/* Imagen ilustrativa */}
          <div className="relative h-64 md:h-auto bg-[#1C1C1C]">
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full aspect-[1.6/1] bg-gradient-to-br from-gray-800 to-black rounded-xl border border-gray-700 shadow-2xl flex flex-col justify-between p-6">
                <div className="flex justify-between items-start">
                  <div className="relative w-16 h-12">
                    <Image
                      src="/logos/logopositivo.svg"
                      alt="One Star"
                      fill
                      className="object-contain filter invert"
                    />
                  </div>
                  <span className="text-white font-[var(--font-barlow)] tracking-widest text-sm opacity-80">GIFT CARD</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono opacity-50 text-xs mb-1">CÓDIGO DIGITAL</div>
                  <div className="text-white font-[var(--font-montserrat)] font-bold tracking-wider">**** **** **** ****</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Formulario/Info */}
          <div className="p-8 md:p-12">
            <h1 className="text-3xl font-[var(--font-barlow)] font-bold text-[#1C1C1C] mb-4 uppercase">
              Tarjeta de Regalo
            </h1>
            <p className="text-gray-600 font-[var(--font-montserrat)] mb-8">
              ¿No sabes qué regalar? Con nuestra tarjeta de regalo virtual, 
              esa persona especial podrá elegir exactamente lo que quiere.
            </p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 font-[var(--font-montserrat)]">Selecciona el monto</label>
                <div className="grid grid-cols-3 gap-3">
                  {["$50.000", "$100.000", "$200.000", "$300.000", "$500.000"].map((monto) => (
                    <button 
                      key={monto} 
                      className="border border-[#E0E0E0] hover:border-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white transition-colors py-3 rounded font-[var(--font-barlow)] font-bold text-lg"
                    >
                      {monto}
                    </button>
                  ))}
                  <button className="border border-[#E0E0E0] hover:border-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white transition-colors py-3 rounded font-[var(--font-barlow)] font-bold text-lg">
                    Otro
                  </button>
                </div>
              </div>
              
              <button className="w-full bg-[#E31C23] text-white py-4 font-[var(--font-barlow)] font-bold text-lg uppercase tracking-wider hover:bg-black transition-colors rounded">
                Añadir al carrito
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                La tarjeta de regalo digital se enviará por correo electrónico inmediatamente después de la compra. Válida por 12 meses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
