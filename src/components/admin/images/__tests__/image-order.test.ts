import { describe, expect, it } from "vitest"
import {
  moveImageToColorPanelEnd,
  moveImageWithinColorGroup,
  reorderImageOnCardDrop,
} from "../image-order"

const sample = [
  { id: "n1", color: "Negro", position: 0 },
  { id: "b1", color: "Blanco", position: 1 },
  { id: "n2", color: "Negro", position: 2 },
  { id: "n3", color: "Negro", position: 3 },
  { id: "b2", color: "Blanco", position: 4 },
]

describe("image-order", () => {
  it("intercambia hacia la derecha dentro del mismo color saltando colores intercalados", () => {
    const res = moveImageWithinColorGroup(sample, 0, 1)
    expect(res.map((i) => i.id)).toEqual(["n2", "b1", "n1", "n3", "b2"])
    expect(res.map((i) => i.position)).toEqual([0, 1, 2, 3, 4])
  })

  it("no cambia la lista si ya está en el borde de su color", () => {
    expect(moveImageWithinColorGroup(sample, 0, -1)).toBe(sample)
    expect(moveImageWithinColorGroup(sample, 3, 1)).toBe(sample)
  })

  it("mueve correctamente al arrastrar hacia la tarjeta inmediatamente siguiente", () => {
    const simple = [
      { id: "1", color: "Negro", position: 0 },
      { id: "2", color: "Negro", position: 1 },
      { id: "3", color: "Negro", position: 2 },
    ]
    const res = reorderImageOnCardDrop(simple, 0, 1)
    expect(res.map((i) => i.id)).toEqual(["2", "1", "3"])
    expect(res.map((i) => i.position)).toEqual([0, 1, 2])
  })

  it("mueve correctamente al arrastrar varias posiciones hacia adelante o atrás y adopta color destino", () => {
    const resForward = reorderImageOnCardDrop(sample, 0, 3)
    expect(resForward.map((i) => i.id)).toEqual(["b1", "n2", "n3", "n1", "b2"])
    expect(resForward[3].color).toBe("Negro")

    const resCrossColor = reorderImageOnCardDrop(sample, 0, 4)
    expect(resCrossColor.map((i) => i.id)).toEqual(["b1", "n2", "n3", "b2", "n1"])
    expect(resCrossColor[4].color).toBe("Blanco")
  })

  it("mueve al final de otro panel de color sin mutar si ya pertenece a él", () => {
    expect(moveImageToColorPanelEnd(sample, 0, "Negro")).toBe(sample)
    const moved = moveImageToColorPanelEnd(sample, 0, "Blanco")
    expect(moved.map((i) => i.id)).toEqual(["b1", "n2", "n3", "b2", "n1"])
    expect(moved[4].color).toBe("Blanco")
  })
})
