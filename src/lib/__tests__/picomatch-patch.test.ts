import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"

/**
 * Prueba del parche local de picomatch 4.0.7 (patches/picomatch@4.0.7.patch) para
 * GHSA-fc5q-39xc-vjpf: un patrón extglob de una sola rama con comodín (p. ej. `+(*a)`)
 * producía cuantificadores anidados y un tiempo exponencial. Si el parche desaparece
 * (cambio de versión, lockfile regenerado sin `patchedDependencies`), esta prueba falla.
 */
// Se resuelve por el mismo camino que la usa la compilación de producción:
// @sentry/nextjs → @rollup/plugin-commonjs → picomatch.
const fromSentry = createRequire(createRequire(import.meta.url).resolve("@sentry/nextjs"))
const fromCommonjs = createRequire(fromSentry.resolve("@rollup/plugin-commonjs"))
const picomatch = fromCommonjs("picomatch") as {
  isMatch: (input: string, pattern: string) => boolean
  makeRe: (pattern: string) => RegExp
}

describe("parche de picomatch (GHSA-fc5q-39xc-vjpf)", () => {
  it("no anida la repetición exterior alrededor del comodín", () => {
    for (const pattern of ["+(*)c", "+(*a)", "+(a*)", "+(a*b)", "*(a*b)c", "x+(*a)y"]) {
      expect(picomatch.makeRe(pattern).source).not.toMatch(/\)[+*]/)
    }
  })

  it("responde rápido ante entradas hostiles", () => {
    const start = performance.now()
    for (const pattern of ["+(*)a", "+(*a)", "*(a*)b", "+(a*b)c"]) {
      picomatch.isMatch(`${"a".repeat(10_000)}!`, pattern)
    }
    // Sin el parche, 25 caracteres ya tardan cientos de ms y 10.000 no terminan.
    expect(performance.now() - start).toBeLessThan(1_000)
  })

  it("conserva las coincidencias normales", () => {
    const cases: [string, string[], string[]][] = [
      ["+(*a)", ["a", "aba", "aaa"], ["b", "aaa!"]],
      ["+(a*b)", ["ab", "abab", "acbab"], ["a", "aba"]],
      ["*(a*b)c", ["c", "abc", "ababc"], ["abb"]],
      ["+(foo|bar)", ["foobar"], ["baz"]],
      ["src/**/*.js", ["src/a.js", "src/x/y/b.js"], ["src/a.ts"]],
    ]
    for (const [pattern, yes, no] of cases) {
      for (const input of yes) expect(picomatch.isMatch(input, pattern), `${pattern} ~ ${input}`).toBe(true)
      for (const input of no) expect(picomatch.isMatch(input, pattern), `${pattern} !~ ${input}`).toBe(false)
    }
  })
})
