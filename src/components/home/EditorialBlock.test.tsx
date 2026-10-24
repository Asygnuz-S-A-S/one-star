import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import EditorialBlock from "./EditorialBlock"

describe("EditorialBlock", () => {
  it("renders the configured campaign message and named action", () => {
    const html = renderToStaticMarkup(<EditorialBlock block={{ version: 1, kind: "editorialBlock", appearance: "carbon", title: "One Star Journal", body: "Historias detrás de cada drop.", cta: { label: "Leer historias", href: "/blog" } }} />)
    expect(html).toContain("One Star Journal")
    expect(html).toContain("Leer historias")
    expect(html).toContain('href="/blog"')
  })
})
