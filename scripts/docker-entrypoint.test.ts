import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import { afterEach, describe, expect, it } from "vitest"

const entrypoint = resolve(process.cwd(), "docker-entrypoint.sh")
const temporaryDirectories: string[] = []

function createExecutable(path: string, contents: string) {
  writeFileSync(path, contents)
  chmodSync(path, 0o755)
}

function runEntrypoint(options: {
  failProbes?: number
  maxAttempts?: string
  migrateExitCode?: number
  command?: string[]
} = {}) {
  const testDirectory = mkdtempSync(join(tmpdir(), "onestar-entrypoint-"))
  const binDirectory = join(testDirectory, "bin")
  temporaryDirectories.push(testDirectory)

  spawnSync("mkdir", ["-p", binDirectory], { encoding: "utf8" })

  createExecutable(
    join(binDirectory, "node"),
    `#!/bin/sh
set -eu
if [ "$*" = "server.js" ]; then
  printf started > "$ENTRYPOINT_TEST_STATE/app-started"
  exit 0
fi

printf '%s\n' "$*" >> "$ENTRYPOINT_TEST_STATE/node-calls"

case "$*" in
  *"db execute"*)
    count_file="$ENTRYPOINT_TEST_STATE/probe-count"
    count=0
    if [ -f "$count_file" ]; then count="$(cat "$count_file")"; fi
    count=$((count + 1))
    printf '%s' "$count" > "$count_file"
    if [ "$count" -le "\${ENTRYPOINT_TEST_FAIL_PROBES:-0}" ]; then exit 1; fi
    ;;
  *"migrate deploy"*) exit "\${ENTRYPOINT_TEST_MIGRATE_EXIT_CODE:-0}" ;;
esac
`,
  )

  createExecutable(
    join(binDirectory, "sleep"),
    `#!/bin/sh
set -eu
printf '%s\n' "$1" >> "$ENTRYPOINT_TEST_STATE/sleep-calls"
`,
  )

  const result = spawnSync(
    "/bin/sh",
    [entrypoint, ...(options.command ?? ["node", "server.js"])],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDirectory}:${process.env.PATH ?? ""}`,
        ENTRYPOINT_TEST_STATE: testDirectory,
        ENTRYPOINT_TEST_FAIL_PROBES: String(options.failProbes ?? 0),
        ENTRYPOINT_TEST_MIGRATE_EXIT_CODE: String(options.migrateExitCode ?? 0),
        DATABASE_URL: "postgresql://runtime:secret@db:5432/onestar",
        DIRECT_URL: "postgresql://direct:secret@db:5432/onestar",
        DATABASE_STARTUP_MAX_ATTEMPTS: options.maxAttempts ?? "3",
        DATABASE_STARTUP_RETRY_SECONDS: "0",
      },
    },
  )

  const readOptional = (name: string) => {
    try {
      return readFileSync(join(testDirectory, name), "utf8")
    } catch {
      return ""
    }
  }

  return {
    ...result,
    appStarted: readOptional("app-started") === "started",
    nodeCalls: readOptional("node-calls").trim().split("\n").filter(Boolean),
    sleepCalls: readOptional("sleep-calls").trim().split("\n").filter(Boolean),
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe("docker-entrypoint", () => {
  it("sondea, migra y finalmente inicia la aplicación", () => {
    const result = runEntrypoint()

    expect(result.status).toBe(0)
    expect(result.nodeCalls).toEqual([
      "node_modules/prisma/build/index.js db execute --stdin --schema prisma/schema.prisma",
      "node_modules/prisma/build/index.js migrate deploy",
    ])
    expect(result.nodeCalls.join(" ")).not.toContain("postgresql://")
    expect(result.appStarted).toBe(true)
  })

  it("reintenta la conexión antes de migrar e iniciar", () => {
    const result = runEntrypoint({ failProbes: 2 })

    expect(result.status).toBe(0)
    expect(result.nodeCalls.filter((call) => call.includes("db execute"))).toHaveLength(3)
    expect(result.nodeCalls.filter((call) => call.includes("migrate deploy"))).toHaveLength(1)
    expect(result.sleepCalls).toEqual(["0", "0"])
    expect(result.appStarted).toBe(true)
  })

  it("falla sin migrar ni iniciar cuando agota los intentos", () => {
    const result = runEntrypoint({ failProbes: 99 })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("3 intentos")
    expect(result.nodeCalls.filter((call) => call.includes("db execute"))).toHaveLength(3)
    expect(result.nodeCalls.some((call) => call.includes("migrate deploy"))).toBe(false)
    expect(result.appStarted).toBe(false)
  })

  it("no inicia la aplicación cuando migrate deploy falla", () => {
    const result = runEntrypoint({ migrateExitCode: 7 })

    expect(result.status).toBe(7)
    expect(result.appStarted).toBe(false)
  })

  it("rechaza una configuración de reintentos inválida", () => {
    const result = runEntrypoint({ maxAttempts: "cero" })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("DATABASE_STARTUP_MAX_ATTEMPTS")
    expect(result.nodeCalls).toEqual([])
    expect(result.appStarted).toBe(false)
  })

  it("ejecuta comandos auxiliares sin sondear ni migrar", () => {
    const result = runEntrypoint({
      failProbes: 99,
      command: ["sh", "-c", "printf started > \"$ENTRYPOINT_TEST_STATE/app-started\""],
    })

    expect(result.status).toBe(0)
    expect(result.nodeCalls).toEqual([])
    expect(result.appStarted).toBe(true)
  })
})
