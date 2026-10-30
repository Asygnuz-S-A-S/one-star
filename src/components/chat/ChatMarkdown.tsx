import { Fragment, type ReactNode } from "react"
import { isSafePublicUrl } from "@/lib/safe-url"

/**
 * Markdown mínimo para las respuestas del asistente: párrafos, saltos de línea,
 * listas (- • 1.), **negrita**, *cursiva* y [texto](url). Arma nodos de React,
 * nunca HTML, así que un texto del modelo no puede inyectar marcado.
 */
export default function ChatMarkdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null
  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? "ol" : "ul"
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? "list-decimal" : "list-disc"} space-y-0.5 pl-5`}>
        {list.items.map((item, i) => <li key={i}>{inline(item)}</li>)}
      </Tag>
    )
    list = null
  }

  for (const raw of text.split("\n")) {
    const line = raw.trim()
    const bullet = /^[-•*]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    const item = bullet ?? numbered
    if (item) {
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flush()
      list ??= { ordered, items: [] }
      list.items.push(item[1])
      continue
    }
    flush()
    if (line) blocks.push(<p key={blocks.length}>{inline(line)}</p>)
  }
  flush()

  return <div className="space-y-2 break-words">{blocks}</div>
}

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) out.push(text.slice(last, index))
    const [whole, bold, italic, label, href] = match
    const key = out.length
    if (bold) out.push(<strong key={key}>{inline(bold)}</strong>)
    else if (italic) out.push(<em key={key}>{italic}</em>)
    else if (label && href && isSafePublicUrl(href)) {
      const external = /^https?:\/\//i.test(href)
      out.push(
        <a key={key} href={href} className="font-semibold underline underline-offset-2" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>
      )
    } else out.push(<Fragment key={key}>{whole}</Fragment>)
    last = index + whole.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
