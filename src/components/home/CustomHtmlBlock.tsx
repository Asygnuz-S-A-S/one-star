import React from "react"

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

  return (
    <section className="custom-html-block w-full">
      {css && <style>{css}</style>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  )
}
