import { describe, expect, it } from "vitest"

import {
  MAX_PRODUCT_VIDEO_BYTES,
  MAX_PRODUCT_VIDEO_SECONDS,
  formatVideoDuration,
  getProductVideoRejection,
} from "../product-video"

describe("getProductVideoRejection", () => {
  it("acepta un MP4 corto y liviano", () => {
    // Arrange
    const candidate = { type: "video/mp4", size: 2 * 1024 * 1024, durationSeconds: 3.2 }

    // Act
    const rejection = getProductVideoRejection(candidate)

    // Assert
    expect(rejection).toBeNull()
  })

  it("acepta el video cuando el navegador no pudo leer la duración", () => {
    expect(
      getProductVideoRejection({ type: "video/webm", size: 1024, durationSeconds: null })
    ).toBeNull()
  })

  it("rechaza archivos que no son video", () => {
    expect(
      getProductVideoRejection({ type: "image/png", size: 1024, durationSeconds: null })
    ).toMatch(/debe ser un video/)
  })

  it("rechaza formatos de video poco compatibles", () => {
    expect(
      getProductVideoRejection({ type: "video/x-msvideo", size: 1024, durationSeconds: 2 })
    ).toMatch(/MP4, WebM o MOV/)
  })

  it("rechaza videos más pesados que el tope", () => {
    expect(
      getProductVideoRejection({
        type: "video/mp4",
        size: MAX_PRODUCT_VIDEO_BYTES + 1,
        durationSeconds: 2,
      })
    ).toMatch(/no puede pesar más de 20 MB/)
  })

  it("rechaza videos más largos que el tope", () => {
    expect(
      getProductVideoRejection({
        type: "video/mp4",
        size: 1024,
        durationSeconds: MAX_PRODUCT_VIDEO_SECONDS + 0.1,
      })
    ).toMatch(/no puede durar más de 15 segundos/)
  })
})

describe("formatVideoDuration", () => {
  it("redondea a una décima y usa coma decimal", () => {
    expect(formatVideoDuration(3)).toBe("3 s")
    expect(formatVideoDuration(12.46)).toBe("12,5 s")
  })
})
