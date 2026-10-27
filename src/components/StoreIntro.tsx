import Image from "next/image"

/**
 * Se ejecuta antes del primer pintado: marca <html data-intro> solo en la primera visita
 * de la sesión a la home, sin vista previa y sin movimiento reducido. Sin JS no hay intro.
 */
export const STORE_INTRO_SCRIPT = `try{var p=new URLSearchParams(location.search);if(location.pathname==="/"&&!p.has("preview")&&!sessionStorage.getItem("os-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-intro","");sessionStorage.setItem("os-intro","1")}}catch(e){}`

/** Capa de apertura de marca: la página ya está renderizada debajo, solo se cubre ~1 s. */
export default function StoreIntro() {
  return (
    <div className="store-intro" aria-hidden="true" style={{ display: "none" }}>
      <div className="store-intro__logo">
        <Image src="/logos/logopositivo.svg" alt="" width={180} height={128} unoptimized />
      </div>
    </div>
  )
}
