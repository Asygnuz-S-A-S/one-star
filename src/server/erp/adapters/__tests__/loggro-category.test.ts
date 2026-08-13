import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroCategory } from "../loggro-category"

describe("detectLoggroCategory", () => {
  it("clasifica chanclas y sandalias como calzado propio", () => {
    expect(detectLoggroCategory("CHANCLAS DISCOVERY BEIGE UNISEX")).toEqual({
      slug: "chanclas-y-sandalias",
      name: "Chanclas y Sandalias",
    })
    expect(detectLoggroCategory("CONVERSE SANDALIA UNISEX TODA NEGRO")).toEqual({
      slug: "chanclas-y-sandalias",
      name: "Chanclas y Sandalias",
    })
  })
})
