import Link from "next/link"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#111111] text-gray-300 border-t border-white/10 mt-auto font-[var(--font-montserrat)] text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Col 1: Marca & Eslogan */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="font-[var(--font-barlow)] font-bold text-2xl tracking-wider text-white uppercase">
                ONE STAR
              </span>
              <span className="block text-[11px] font-semibold text-[#E31C23] tracking-widest uppercase">
                Urban Performance
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed">
              Tu destino premium en Colombia para sneakers y moda deportiva original. Nike, New Balance, Veja, Hoka, Vans, Converse, Skechers y más.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tienda oficial con envíos a toda Colombia</span>
            </div>
          </div>

          {/* Col 2: Catálogo & Colecciones */}
          <div>
            <h3 className="font-[var(--font-barlow)] font-bold text-sm uppercase tracking-widest text-white mb-4">
              Colecciones
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/hombre" className="hover:text-white transition-colors">
                  Hombre
                </Link>
              </li>
              <li>
                <Link href="/mujer" className="hover:text-white transition-colors">
                  Mujer
                </Link>
              </li>
              <li>
                <Link href="/ninos" className="hover:text-white transition-colors">
                  Niños
                </Link>
              </li>
              <li>
                <Link href="/lanzamientos" className="hover:text-white transition-colors">
                  Nuevos Lanzamientos
                </Link>
              </li>
              <li>
                <Link href="/marcas" className="hover:text-white transition-colors">
                  Marcas
                </Link>
              </li>
              <li>
                <Link href="/sale" className="text-[#E31C23] font-semibold hover:underline">
                  Ofertas / Sale
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Políticas & Ayuda */}
          <div>
            <h3 className="font-[var(--font-barlow)] font-bold text-sm uppercase tracking-widest text-white mb-4">
              Ayuda & Políticas
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/envios-y-devoluciones" className="hover:text-white transition-colors">
                  Envíos y Devoluciones
                </Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-white transition-colors">
                  Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacidad" className="hover:text-white transition-colors">
                  Tratamiento de Datos (Ley 1581)
                </Link>
              </li>
              <li>
                <Link href="/tiendas" className="hover:text-white transition-colors">
                  Nuestras Tiendas Físicas
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contacto & Métodos */}
          <div>
            <h3 className="font-[var(--font-barlow)] font-bold text-sm uppercase tracking-widest text-white mb-4">
              Atención al Cliente
            </h3>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li>
                <span className="block text-gray-200 font-medium">Horario de atención:</span>
                Lunes a Sábado: 9:00 a.m. - 7:00 p.m.
              </li>
              <li>
                <span className="block text-gray-200 font-medium">Correo de soporte:</span>
                <a href="mailto:contacto@tiendaonestar.com" className="text-[#E31C23] hover:underline">
                  contacto@tiendaonestar.com
                </a>
              </li>
              <li>
                <span className="block text-gray-200 font-medium">Envíos nacionales:</span>
                Envía · Servientrega (3 a 5 días hábiles)
              </li>
            </ul>
          </div>

        </div>

        {/* Separador */}
        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            © {currentYear} One Star. Todos los derechos reservados. Comercio electrónico seguro para Colombia.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-gray-400">
            <span>Pagos seguros con ePayco</span>
            <span>·</span>
            <span>PSE</span>
            <span>·</span>
            <span>Tarjetas Débito / Crédito</span>
            <span>·</span>
            <span>Addi</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
