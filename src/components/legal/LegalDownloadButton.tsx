"use client"

const CLASS_NAME =
  "mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#1C1C1C] px-5 font-montserrat text-sm font-semibold text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-[#1C1C1C] print:hidden"

/** Con PDF cargado en el admin lo descarga; si no, el navegador guarda la página como PDF. */
export default function LegalDownloadButton({ documentUrl }: { documentUrl?: string | null }) {
  if (documentUrl) {
    return (
      <a href={documentUrl} download target="_blank" rel="noreferrer" className={CLASS_NAME}>
        Descargar PDF
      </a>
    )
  }

  return (
    <button type="button" onClick={() => window.print()} className={CLASS_NAME}>
      Descargar PDF
    </button>
  )
}
