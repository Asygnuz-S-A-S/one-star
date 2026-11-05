/**
 * Arte gráfico de las tarjetas de colección: tipografía, estrella y logos de marca, sin foto de producto.
 * Todo escala con el tamaño de la tarjeta (unidades cqw del contenedor), así se ve igual en celular y escritorio.
 */

export type TileArtKind = "collection" | "launches" | "sale" | "stores" | "gift" | "generic"

const STAR = "M50 0l11.8 34.4H98L68.6 55.6 79.4 90 50 68.8 20.6 90l10.8-34.4L2 34.4h36.2z"
const BRANDS = ["vans", "converse", "hoka", "skechers"]

/** Superficie y si el texto va claro sobre ella. */
export const TILE_ART_SURFACE: Record<TileArtKind, { className: string; dark: boolean }> = {
  collection: { className: "bg-[radial-gradient(90%_80%_at_100%_100%,#5a1114_0%,#1d0c0d_40%,#141414_70%)]", dark: true },
  launches: { className: "bg-[#E31C23]", dark: true },
  sale: { className: "bg-[#F2EEE6]", dark: false },
  stores: { className: "bg-[#232323]", dark: true },
  gift: { className: "bg-[linear-gradient(135deg,#1b1b1b_0%,#2b2620_100%)]", dark: true },
  generic: { className: "bg-[#1C1C1C]", dark: true },
}

/** El arte se elige por destino; la primera tarjeta (destacada) siempre muestra las marcas. */
export function tileArtKind(href: string, featured: boolean): TileArtKind {
  if (featured) return "collection"
  const path = href.split(/[?#]/)[0].replace(/\/$/, "")
  if (path === "/lanzamientos") return "launches"
  if (path === "/sale") return "sale"
  if (path === "/tiendas") return "stores"
  if (path === "/tarjeta-regalo" || path === "/c/tarjetas-regalo") return "gift"
  return "generic"
}

function Star({ className, outline = false }: { className: string; outline?: boolean }) {
  return (
    <svg viewBox="-2 -2 104 99" className={className} aria-hidden="true">
      <path d={STAR} fill={outline ? "none" : "currentColor"} stroke={outline ? "currentColor" : "none"} strokeWidth={outline ? 0.5 : 0} />
    </svg>
  )
}

export default function CollectionTileArt({ kind, title }: { kind: TileArtKind; title: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* En tarjetas anchas el arte se queda en un recuadro a la derecha para no crecer sin límite. */}
      <span className={`@container absolute inset-y-0 right-0 w-full ${kind === "collection" ? "" : "max-w-[26rem]"}`}>
      {kind === "collection" && (
        <>
          <Star outline className="absolute -right-[10%] -top-[18%] w-[70%] text-white/20" />
          <span className="absolute left-[6cqw] top-[22%] font-barlow text-[2.4cqw] font-black uppercase tracking-[0.32em] text-[#E31C23] max-md:text-[3.4cqw]">
            Las marcas que te mueven
          </span>
          <span className="absolute inset-x-[6cqw] top-[40%] grid grid-cols-4 items-center gap-[4cqw]">
            {BRANDS.map((brand) => (
              // eslint-disable-next-line @next/next/no-img-element -- SVG local, no necesita optimización
              <img key={brand} src={`/brands/${brand}.svg`} alt="" className="h-[7cqw] w-full object-contain opacity-85 brightness-0 invert" />
            ))}
          </span>
        </>
      )}
      {kind === "launches" && (
        <>
          <Star className="absolute right-[7cqw] top-[7cqw] w-[8cqw] text-white" />
          <span className="absolute -bottom-[7cqw] -right-[3cqw] font-barlow text-[46cqw] font-black leading-[0.8] tracking-[-0.04em] text-transparent [-webkit-text-stroke:2px_rgb(255_255_255/0.55)]">
            NEW
          </span>
        </>
      )}
      {kind === "sale" && (
        <>
          <span className="absolute -top-[2cqw] right-[5cqw] font-barlow text-[40cqw] font-black leading-none tracking-[-0.05em] text-[#E31C23]">%</span>
          <span className="absolute -inset-x-[20%] top-[50%] -rotate-[7deg] overflow-hidden whitespace-nowrap bg-[#141414] py-[2cqw] font-barlow text-[4cqw] font-extrabold tracking-[0.3em] text-[#F2EEE6]">
            {"SALE ★ ".repeat(12)}
          </span>
        </>
      )}
      {kind === "stores" && (
        <>
          <span className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(70%_70%_at_60%_40%,#000_30%,transparent_80%)]" />
          <svg viewBox="0 0 300 270" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgb(255 255 255 / 0.18)">
            <path d="M-10 200 C80 170 120 120 190 110 S290 60 320 40" strokeWidth="10" />
            <path d="M60 -10 C90 80 130 150 150 280" strokeWidth="6" />
          </svg>
          <svg viewBox="0 0 24 32" className="absolute left-[58%] top-[26%] w-[9cqw]">
            <path fill="#E31C23" d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 32 12 32s12-11.6 12-20.3C24 5.2 18.6 0 12 0z" />
            <circle cx="12" cy="11.5" r="4.2" fill="#232323" />
          </svg>
        </>
      )}
      {kind === "gift" && (
        <>
          <span className="absolute right-[14cqw] top-[18cqw] aspect-[1.586] w-[62%] rotate-[4deg] rounded-[3.5cqw] bg-[#E9E4DA]/90" />
          <span className="absolute right-[7cqw] top-[12cqw] flex aspect-[1.586] w-[62%] -rotate-[8deg] flex-col justify-between rounded-[3.5cqw] bg-[linear-gradient(135deg,#E31C23,#9e1016)] p-[4.5cqw] text-white shadow-[0_20px_40px_-14px_rgb(0_0_0/0.6)]">
            <span className="font-barlow text-[4.6cqw] font-extrabold tracking-[0.14em]">ONE STAR</span>
            <span className="font-montserrat text-[2.8cqw] font-semibold tracking-[0.2em] opacity-85">TARJETA DE REGALO</span>
            <Star className="absolute bottom-[4cqw] right-[4cqw] w-[8cqw] text-white" />
          </span>
        </>
      )}
      {kind === "generic" && (
        <>
          <Star outline className="absolute -right-[18%] -top-[12%] w-[80%] text-white/15" />
          <span className="absolute left-[6cqw] top-[16cqw] font-barlow text-[34cqw] font-black uppercase leading-none text-white/10">{title.charAt(0)}</span>
        </>
      )}
      </span>
    </span>
  )
}
