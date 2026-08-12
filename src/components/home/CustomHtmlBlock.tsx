import React from "react"
import sanitizeHtml from "sanitize-html"

/**
 * Sanitización del HTML del Landing Builder (Server Component).
 * El contenido lo escribe un admin, pero se sanitiza igualmente para
 * mitigar XSS almacenado si una cuenta admin se ve comprometida.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "div", "section", "article", "span", "p",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "img", "picture", "source", "video",
    "ul", "ol", "li",
    "table", "thead", "tbody", "tr", "th", "td",
    "button", "figure", "figcaption",
    "br", "hr", "strong", "em", "b", "i", "u", "small", "blockquote",
  ],
  allowedAttributes: {
    "*": ["class", "id", "style", "title"],
    a: ["href", "target", "rel"],
    img: ["src", "srcset", "alt", "width", "height", "loading"],
    source: ["src", "srcset", "type", "media"],
    video: ["src", "poster", "controls", "muted", "loop", "playsinline", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  // http/https/mailto y rutas relativas; bloquea javascript: y data:
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src", "srcset", "poster"],
  allowProtocolRelative: false,
  // sanitize-html elimina los handlers on* y <script> por defecto
}

/**
 * Limpieza básica del CSS del bloque. No es un parser CSS completo:
 * elimina los vectores conocidos (escape de la etiqueta style, expression(),
 * javascript:, @import y url() con esquemas no https/relativos).
 */
function sanitizeCss(css: string): string {
  return css
    .replace(/<\/style/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/@import\b/gi, "")
    .replace(/url\(\s*(['"]?)\s*(?!https:\/\/|\/|\.\/|\.\.\/|#)[^)]*\)/gi, "url()")
}

export default function CustomHtmlBlock({ html, css }: { html: string; css: string }) {
  if (!html || html.trim() === "") {
    return (
      <section className="custom-html-block w-full py-12 px-4 bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center">
        <p className="text-gray-400 font-mono text-sm uppercase tracking-widest text-center">
          Bloque HTML Vacío<br/>
          <span className="text-xs normal-case tracking-normal">Haz clic en Configurar para añadir código</span>
        </p>
      </section>
    )
  }

  const safeHtml = sanitizeHtml(html, SANITIZE_OPTIONS)
  const safeCss = css ? sanitizeCss(css) : ""

  return (
    <section className="custom-html-block w-full">
      {safeCss && <style>{safeCss}</style>}
      <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
    </section>
  )
}
