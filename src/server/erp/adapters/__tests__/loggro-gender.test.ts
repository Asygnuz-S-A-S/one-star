import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroGender } from "../loggro-gender"

describe("detectLoggroGender", () => {
  it("detecta HOMBRE como una palabra completa", () => {
    expect(detectLoggroGender("TENIS ON CLOUD 6 HOMBRE NEGRO")).toBe("HOMBRE")
    expect(detectLoggroGender("SOMBRERO NEGRO")).toBeUndefined()
  })
})
