import { execFileSync } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import {
  checkMigrationSafety,
  detectDestructiveOperations,
  runCli,
} from "./check-migration-safety"

const temporaryRepositories: string[] = []

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function createRepository(): { base: string; cwd: string } {
  const cwd = mkdtempSync(join(tmpdir(), "onestar-migration-safety-"))
  temporaryRepositories.push(cwd)
  git(cwd, "init", "--initial-branch=main")
  git(cwd, "config", "user.email", "migration-safety@example.com")
  git(cwd, "config", "user.name", "Migration Safety Test")
  writeFileSync(join(cwd, "README.md"), "baseline\n")
  git(cwd, "add", "README.md")
  git(cwd, "commit", "-m", "baseline")

  return { base: git(cwd, "rev-parse", "HEAD"), cwd }
}

function addMigration(cwd: string, name: string, sql: string): string {
  const relativePath = `prisma/migrations/${name}/migration.sql`
  const absolutePath = join(cwd, relativePath)
  mkdirSync(join(absolutePath, ".."), { recursive: true })
  writeFileSync(absolutePath, sql)
  git(cwd, "add", relativePath)
  git(cwd, "commit", "-m", `add migration ${name}`)

  return relativePath
}

const completeChecks = {
  applicationNoLongerUsesObjects: true,
  backfillCompletedOrNotRequired: true,
  backwardCompatibilityVerified: true,
  rollbackPlanDocumented: true,
} as const

function commitContractManifest(
  cwd: string,
  id: string,
  manifest: unknown = {
    checks: completeChecks,
    id,
    objects: ["column:Product.legacyCode"],
    version: 1,
  },
): string {
  const relativePath = `prisma/migration-contracts/${id}.json`
  const absolutePath = join(cwd, relativePath)
  mkdirSync(join(absolutePath, ".."), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(manifest, null, 2)}\n`)
  git(cwd, "add", relativePath)
  git(cwd, "commit", "-m", `prepare contract ${id}`)

  return git(cwd, "rev-parse", "HEAD")
}

afterEach(() => {
  for (const cwd of temporaryRepositories.splice(0)) {
    rmSync(cwd, { force: true, recursive: true })
  }
})

describe("checkMigrationSafety", () => {
  it("aprueba cuando el diff no contiene migraciones", () => {
    const repository = createRepository()

    expect(checkMigrationSafety(repository)).toEqual({
      contractions: [],
      inspectedFiles: [],
    })
  })

  it("inspecciona y aprueba una migración expansiva nueva", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000100_add_nickname",
      'ALTER TABLE "User" ADD COLUMN "nickname" TEXT;\n',
    )

    expect(checkMigrationSafety(repository)).toEqual({
      contractions: [],
      inspectedFiles: [migration],
    })
  })

  it("parsea rutas Git especiales sin depender del quoting", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000150_add_special\tname",
      'CREATE TABLE "SpecialName" ("id" TEXT PRIMARY KEY);\n',
    )

    expect(checkMigrationSafety(repository).inspectedFiles).toEqual([migration])
  })

  it("rechaza una migración histórica modificada", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000200_add_profile",
      'CREATE TABLE "Profile" ("id" TEXT PRIMARY KEY);\n',
    )
    const base = git(repository.cwd, "rev-parse", "HEAD")
    writeFileSync(
      join(repository.cwd, migration),
      'CREATE TABLE "Profile" ("id" TEXT PRIMARY KEY, "name" TEXT);\n',
    )
    git(repository.cwd, "add", migration)
    git(repository.cwd, "commit", "-m", "modify historical migration")

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${migration}: migración histórica modificada`,
    )
  })

  it("rechaza DDL destructivo nuevo sin preparación", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000300_drop_legacy_code",
      'ALTER TABLE "Product" DROP COLUMN "legacyCode";\n',
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: DROP COLUMN`,
    )
  })

  it("ignora DDL mencionado únicamente en comentarios SQL", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000400_document_rollback",
      [
        "-- rollback: DROP TABLE \"Profile\";",
        "/* ALTER TABLE \"User\" DROP COLUMN \"nickname\"; */",
        'ALTER TABLE "User" ADD COLUMN "nickname" TEXT;',
        "",
      ].join("\n"),
    )

    expect(checkMigrationSafety(repository).inspectedFiles).toEqual([migration])
  })

  it("detecta todas las operaciones incompatibles definidas", () => {
    const sql = [
      'DROP TABLE "Legacy";',
      'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
      'DROP TYPE "LegacyStatus";',
      'ALTER TABLE "Order" DROP CONSTRAINT "Order_couponId_fkey";',
      'ALTER TABLE "OldName" RENAME TO "NewName";',
      'ALTER TABLE "User" RENAME COLUMN "name" TO "displayName";',
      'TRUNCATE TABLE "AuditLog";',
      'ALTER TABLE "Variant" ALTER COLUMN "stock" TYPE BIGINT;',
      'ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toEqual([
      "DROP TABLE",
      "DROP COLUMN",
      "DROP TYPE",
      "DROP CONSTRAINT",
      "RENAME TABLE",
      "RENAME COLUMN",
      "TRUNCATE",
      "ALTER COLUMN TYPE",
      "SET NOT NULL",
    ])
  })

  it("detecta sintaxis PostgreSQL con COLUMN opcional", () => {
    const sql = [
      'ALTER TABLE "Product" DROP "legacyCode";',
      'ALTER TABLE "User" RENAME "name" TO "displayName";',
      'ALTER TABLE "Variant" ALTER "stock" TYPE BIGINT;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toEqual([
      "DROP COLUMN",
      "RENAME COLUMN",
      "ALTER COLUMN TYPE",
    ])
  })

  it("no confunde marcadores de comentario dentro de literales SQL", () => {
    const sql =
      "INSERT INTO \"AuditLog\" (\"message\") VALUES ('-- rollback only'); DROP TABLE \"Legacy\";"

    expect(detectDestructiveOperations(sql)).toEqual(["DROP TABLE"])
  })

  it("cierra literales estándar ante backslash y analiza el DDL posterior", () => {
    const repository = createRepository()
    const contractId = "drop-after-standard-string"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    const migration = addMigration(
      repository.cwd,
      "20260824000425_drop_after_standard_string",
      [
        "SELECT '\\';",
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toEqual({
      contractions: [{ after: preparation, id: contractId, path: migration }],
      inspectedFiles: [migration],
    })
  })

  it("ignora DDL no ejecutado dentro de literales y bloques dollar-quoted", () => {
    const sql = [
      "COMMENT ON TABLE \"User\" IS 'DROP TABLE User';",
      "CREATE FUNCTION cleanup_note() RETURNS text AS $$",
      "BEGIN RETURN 'ALTER TABLE User DROP COLUMN name'; END;",
      "$$ LANGUAGE plpgsql;",
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toEqual([])
  })

  it("rechaza un bloque DO top-level porque su SQL procedural no es verificable", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000450_unverifiable_do",
      ["DO $$", "BEGIN", "  NULL;", "END", "$$;", ""].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: DO top-level no es verificable`,
    )
  })

  it("rechaza CALL top-level porque el procedimiento llamado no es verificable", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000455_unverifiable_call",
      "CALL cleanup_legacy_data();\n",
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: CALL top-level no es verificable`,
    )
  })

  it("rechaza columnas nuevas NOT NULL sin default compatible", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "nickname" TEXT NOT NULL;',
      'ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("no atribuye a una columna required el DEFAULT de otra cláusula", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL,',
      '  ALTER COLUMN "nickname" SET DEFAULT \'available\';',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("rechaza DEFAULT NULL para una columna nueva required", () => {
    const sql = 'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL DEFAULT NULL;'

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("admite un DEFAULT string no nulo en la misma columna required", () => {
    const sql =
      'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL DEFAULT \'ready\';'

    expect(detectDestructiveOperations(sql)).not.toContain("ADD COLUMN NOT NULL")
  })

  it("admite un DEFAULT numérico no nulo en la misma columna required", () => {
    const sql =
      'ALTER TABLE "User" ADD COLUMN "requiredRank" INTEGER NOT NULL DEFAULT 0;'

    expect(detectDestructiveOperations(sql)).not.toContain("ADD COLUMN NOT NULL")
  })

  it("no confunde ON DELETE SET DEFAULT con un default propio", () => {
    const sql = [
      'ALTER TABLE "Child" ADD COLUMN "parentId" TEXT NOT NULL',
      '  REFERENCES "Parent" ("id") ON DELETE SET DEFAULT DEFERRABLE;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("trata PRIMARY KEY sin valor generado como columna required insegura", () => {
    const sql = 'ALTER TABLE "User" ADD COLUMN "externalId" TEXT PRIMARY KEY;'

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("trata PRIMARY KEY de tabla como required para una columna agregada", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "externalId" TEXT,',
      '  ADD CONSTRAINT "User_externalId_pkey" PRIMARY KEY ("externalId");',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("admite SERIAL PRIMARY KEY porque PostgreSQL genera el valor", () => {
    const sql = 'ALTER TABLE "User" ADD COLUMN "sequenceId" SERIAL PRIMARY KEY;'

    expect(detectDestructiveOperations(sql)).not.toContain("ADD COLUMN NOT NULL")
  })

  it("admite IDENTITY PRIMARY KEY porque PostgreSQL genera el valor", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "identityId" INTEGER',
      "  GENERATED ALWAYS AS IDENTITY PRIMARY KEY;",
    ].join("\n")

    expect(detectDestructiveOperations(sql)).not.toContain("ADD COLUMN NOT NULL")
  })

  it("rechaza una columna required si después elimina IDENTITY", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "identityId" INTEGER',
      "  GENERATED ALWAYS AS IDENTITY PRIMARY KEY;",
      'ALTER TABLE "User" ALTER COLUMN "identityId" DROP IDENTITY;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("rechaza una columna required si después elimina su DEFAULT", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL DEFAULT \'ready\';',
      'ALTER TABLE "User" ALTER COLUMN "requiredCode" DROP DEFAULT;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("rechaza una columna required si después cambia a DEFAULT NULL", () => {
    const sql = [
      'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL DEFAULT \'ready\';',
      'ALTER TABLE "User" ALTER COLUMN "requiredCode" SET DEFAULT NULL;',
    ].join("\n")

    expect(detectDestructiveOperations(sql)).toContain("ADD COLUMN NOT NULL")
  })

  it("admite una contracción preparada en un commit ancestro de la base", () => {
    const repository = createRepository()
    const contractId = "drop-product-legacy-code"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const migration = addMigration(
      repository.cwd,
      "20260824000500_contract_legacy_code",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        "",
      ].join("\n"),
    )

    expect(
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toEqual({
      contractions: [{ after: preparation, id: contractId, path: migration }],
      inspectedFiles: [migration],
    })
  })

  it("admite un commit de preparación merge que integra el manifiesto", () => {
    const repository = createRepository()
    const contractId = "drop-merge-prepared-legacy"
    git(repository.cwd, "checkout", "-b", "contract-preparation")
    commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    git(repository.cwd, "checkout", "main")
    writeFileSync(join(repository.cwd, "main.ts"), "main branch change\n")
    git(repository.cwd, "add", "main.ts")
    git(repository.cwd, "commit", "-m", "advance main")
    git(
      repository.cwd,
      "merge",
      "--no-ff",
      "contract-preparation",
      "-m",
      "merge contract preparation",
    )
    const preparation = git(repository.cwd, "rev-parse", "HEAD")
    const migration = addMigration(
      repository.cwd,
      "20260824000505_contract_merge_prepared",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toEqual({
      contractions: [{ after: preparation, id: contractId, path: migration }],
      inspectedFiles: [migration],
    })
  })

  it("rechaza un merge ajeno que no cambió el manifiesto contra su primer padre", () => {
    const repository = createRepository()
    const contractId = "drop-unrelated-merge-legacy"
    git(repository.cwd, "branch", "unrelated-branch", repository.base)
    commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    git(repository.cwd, "checkout", "unrelated-branch")
    writeFileSync(join(repository.cwd, "unrelated.ts"), "unrelated branch change\n")
    git(repository.cwd, "add", "unrelated.ts")
    git(repository.cwd, "commit", "-m", "unrelated branch")
    git(repository.cwd, "checkout", "main")
    git(
      repository.cwd,
      "merge",
      "--no-ff",
      "unrelated-branch",
      "-m",
      "merge unrelated work",
    )
    const preparation = git(repository.cwd, "rev-parse", "HEAD")
    const migration = addMigration(
      repository.cwd,
      "20260824000507_contract_unrelated_merge",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(
      `${migration}: prisma/migration-contracts/${contractId}.json no fue creado ni actualizado por el commit de preparación`,
    )
  })

  it("vincula todos los DDL incompatibles a objetivos canónicos exactos", () => {
    const repository = createRepository()
    const contractId = "contract-all-supported-objects"
    const objects = [
      "column:Product.legacyCode",
      "column:Product.slug",
      "column:User.displayName",
      "column:User.requiredCode",
      "column:Variant.stock",
      "constraint:Order.Order_couponId_fkey",
      "table:AuditLog",
      "table:Legacy",
      "table:OldName",
      "type:LegacyStatus",
    ]
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects,
      version: 1,
    })
    const migration = addMigration(
      repository.cwd,
      "20260824000510_contract_supported_objects",
      [
        'DROP TABLE "Legacy";',
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        'DROP TYPE "LegacyStatus";',
        'ALTER TABLE "Order" DROP CONSTRAINT "Order_couponId_fkey";',
        'ALTER TABLE "OldName" RENAME TO "NewName";',
        'ALTER TABLE "User" RENAME COLUMN "displayName" TO "name";',
        'TRUNCATE TABLE "AuditLog";',
        'ALTER TABLE "Variant" ALTER COLUMN "stock" TYPE BIGINT;',
        'ALTER TABLE "Product" ALTER COLUMN "slug" SET NOT NULL;',
        'ALTER TABLE "User" ADD COLUMN "requiredCode" TEXT NOT NULL;',
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        "",
      ].join("\n"),
    )

    expect(
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toEqual({
      contractions: [{ after: preparation, id: contractId, path: migration }],
      inspectedFiles: [migration],
    })
  })

  it("rechaza una contracción sin contract-id", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000525_contract_without_id",
      [
        `-- onestar:contract-after ${repository.base}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: agrega exactamente un marcador -- onestar:contract-id <id>`,
    )
  })

  it("rechaza una contracción cuyo manifiesto no existe", () => {
    const repository = createRepository()
    writeFileSync(join(repository.cwd, "preparation.ts"), "stop using Legacy\n")
    git(repository.cwd, "add", "preparation.ts")
    git(repository.cwd, "commit", "-m", "prepare legacy removal")
    const preparation = git(repository.cwd, "rev-parse", "HEAD")
    const contractId = "drop-legacy-table"
    const migration = addMigration(
      repository.cwd,
      "20260824000535_contract_without_manifest",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(
      `${migration}: no existe prisma/migration-contracts/${contractId}.json`,
    )
  })

  it("rechaza un manifiesto con un check falso", () => {
    const repository = createRepository()
    const contractId = "drop-invalid-contract"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: { ...completeChecks, rollbackPlanDocumented: false },
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    const migration = addMigration(
      repository.cwd,
      "20260824000540_contract_invalid_manifest",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: manifiesto inválido`)
  })

  it("rechaza un manifiesto sin objetos", () => {
    const repository = createRepository()
    const contractId = "drop-empty-contract"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: [],
      version: 1,
    })
    const migration = addMigration(
      repository.cwd,
      "20260824000542_contract_without_objects",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: manifiesto inválido`)
  })

  it("rechaza un manifiesto cuyos objetos no coinciden con el DDL", () => {
    const repository = createRepository()
    const contractId = "drop-wrong-object"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["column:Product.legacyCode"],
      version: 1,
    })
    const migration = addMigration(
      repository.cwd,
      "20260824000543_contract_wrong_object",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: objects no coincide con los objetivos del DDL`)
  })

  it("rechaza evidencia que el commit de preparación no creó ni actualizó", () => {
    const repository = createRepository()
    const contractId = "drop-unrelated-legacy"
    commitContractManifest(repository.cwd, contractId)
    writeFileSync(join(repository.cwd, "preparation.ts"), "stop using Legacy\n")
    git(repository.cwd, "add", "preparation.ts")
    git(repository.cwd, "commit", "-m", "prepare without touching manifest")
    const preparation = git(repository.cwd, "rev-parse", "HEAD")
    addMigration(
      repository.cwd,
      "20260824000545_contract_unrelated_manifest",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(
      `prisma/migration-contracts/${contractId}.json no fue creado ni actualizado por el commit de preparación`,
    )
  })

  it("rechaza un manifiesto modificado después del commit de preparación", () => {
    const repository = createRepository()
    const contractId = "drop-mutable-legacy"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const base = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["Product.legacyCode", "Product.legacyStatus"],
      version: 1,
    })
    addMigration(
      repository.cwd,
      "20260824000547_contract_mutable_manifest",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `prisma/migration-contracts/${contractId}.json cambió después del commit de preparación`,
    )
  })

  it("rechaza cambios intermedios aunque el manifiesto vuelva a los mismos bytes", () => {
    const repository = createRepository()
    const contractId = "drop-reverted-contract"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const manifestPath = `prisma/migration-contracts/${contractId}.json`
    writeFileSync(join(repository.cwd, manifestPath), "{}\n")
    git(repository.cwd, "add", manifestPath)
    git(repository.cwd, "commit", "-m", "temporarily mutate contract")
    writeFileSync(
      join(repository.cwd, manifestPath),
      `${JSON.stringify(
        {
          checks: completeChecks,
          id: contractId,
          objects: ["column:Product.legacyCode"],
          version: 1,
        },
        null,
        2,
      )}\n`,
    )
    git(repository.cwd, "add", manifestPath)
    git(repository.cwd, "commit", "-m", "restore contract bytes")
    const base = git(repository.cwd, "rev-parse", "HEAD")
    const migration = addMigration(
      repository.cwd,
      "202608240005475_contract_reverted_before_base",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${migration}: ${manifestPath} tuvo cambios entre la preparación y el SHA base`,
    )
  })

  it("rechaza un manifiesto modificado por el PR después del SHA base", () => {
    const repository = createRepository()
    const contractId = "drop-head-mutated-contract"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const migration = addMigration(
      repository.cwd,
      "20260824000548_contract_mutated_in_head",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        "",
      ].join("\n"),
    )
    const manifestPath = `prisma/migration-contracts/${contractId}.json`
    writeFileSync(join(repository.cwd, manifestPath), "{}\n")
    git(repository.cwd, "add", manifestPath)
    git(repository.cwd, "commit", "-m", "mutate contract in pull request")

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: ${manifestPath} cambió en HEAD`)
  })

  it("rechaza un manifiesto borrado por el PR después del SHA base", () => {
    const repository = createRepository()
    const contractId = "drop-head-deleted-contract"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const migration = addMigration(
      repository.cwd,
      "20260824000549_contract_deleted_in_head",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        "",
      ].join("\n"),
    )
    const manifestPath = `prisma/migration-contracts/${contractId}.json`
    rmSync(join(repository.cwd, manifestPath))
    git(repository.cwd, "add", "--all")
    git(repository.cwd, "commit", "-m", "delete contract in pull request")

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: no existe ${manifestPath} en HEAD`)
  })

  it("rechaza cambios revertidos del manifiesto entre base y HEAD", () => {
    const repository = createRepository()
    const contractId = "drop-head-reverted-contract"
    const preparation = commitContractManifest(repository.cwd, contractId)
    const migration = addMigration(
      repository.cwd,
      "202608240005495_contract_reverted_in_head",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'ALTER TABLE "Product" DROP COLUMN "legacyCode";',
        "",
      ].join("\n"),
    )
    const manifestPath = `prisma/migration-contracts/${contractId}.json`
    writeFileSync(join(repository.cwd, manifestPath), "{}\n")
    git(repository.cwd, "add", manifestPath)
    git(repository.cwd, "commit", "-m", "temporarily mutate contract in pull request")
    writeFileSync(
      join(repository.cwd, manifestPath),
      `${JSON.stringify(
        {
          checks: completeChecks,
          id: contractId,
          objects: ["column:Product.legacyCode"],
          version: 1,
        },
        null,
        2,
      )}\n`,
    )
    git(repository.cwd, "add", manifestPath)
    git(repository.cwd, "commit", "-m", "restore contract in pull request")

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${migration}: ${manifestPath} tuvo cambios entre el SHA base y HEAD`)
  })

  it("no acepta un marcador contract-after dentro de un bloque dollar-quoted", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000550_fake_contract_marker",
      [
        "SELECT $$",
        `-- onestar:contract-after ${repository.base}`,
        "not a real marker",
        "$$;",
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: agrega exactamente un marcador`,
    )
  })

  it("no acepta un marcador contract-id dentro de un bloque dollar-quoted", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000555_fake_contract_id",
      [
        `-- onestar:contract-after ${repository.base}`,
        "SELECT $$",
        "-- onestar:contract-id hidden-contract",
        "not a real marker",
        "$$;",
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: agrega exactamente un marcador -- onestar:contract-id <id>`,
    )
  })

  it("rechaza contract-id duplicado entre migraciones nuevas", () => {
    const repository = createRepository()
    const contractId = "drop-two-legacy-tables"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:LegacyA"],
      version: 1,
    })
    addMigration(
      repository.cwd,
      "20260824000560_contract_legacy_a",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "LegacyA";',
        "",
      ].join("\n"),
    )
    const duplicate = addMigration(
      repository.cwd,
      "20260824000561_contract_legacy_b",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "LegacyA";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${duplicate}: contract-id ${contractId} está duplicado`)
  })

  it("cuenta contract-id en toda migración nueva aunque no sea destructiva", () => {
    const repository = createRepository()
    const contractId = "drop-reserved-legacy"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    addMigration(
      repository.cwd,
      "20260824000562_expand_with_reserved_contract",
      [
        `-- onestar:contract-id ${contractId}`,
        'CREATE TABLE "Compatible" ("id" TEXT PRIMARY KEY);',
        "",
      ].join("\n"),
    )
    const duplicate = addMigration(
      repository.cwd,
      "20260824000563_contract_reserved_legacy",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() =>
      checkMigrationSafety({ base: preparation, cwd: repository.cwd }),
    ).toThrow(`${duplicate}: contract-id ${contractId} está duplicado`)
  })

  it("rechaza un contract-id ya consumido por una migración de la base", () => {
    const repository = createRepository()
    const contractId = "drop-consumed-legacy"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["table:Legacy"],
      version: 1,
    })
    addMigration(
      repository.cwd,
      "20260824000565_contract_consumed",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )
    const base = git(repository.cwd, "rev-parse", "HEAD")
    const reused = addMigration(
      repository.cwd,
      "20260824000566_contract_reused",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${reused}: contract-id ${contractId} ya fue consumido`,
    )
  })

  it("rechaza una preparación futura que no pertenece a la rama base", () => {
    const repository = createRepository()
    writeFileSync(join(repository.cwd, "preparation.ts"), "remove legacy usage\n")
    git(repository.cwd, "add", "preparation.ts")
    git(repository.cwd, "commit", "-m", "prepare contract")
    const futureCommit = git(repository.cwd, "rev-parse", "HEAD")
    const migration = addMigration(
      repository.cwd,
      "20260824000600_contract_too_early",
      [
        `-- onestar:contract-after ${futureCommit}`,
        "-- onestar:contract-id contract-too-early",
        'DROP TABLE "Legacy";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: el commit de preparación ${futureCommit} no es ancestro del SHA base`,
    )
  })

  it("rechaza un commit de preparación inexistente", () => {
    const repository = createRepository()
    const missingCommit = "f".repeat(40)
    const migration = addMigration(
      repository.cwd,
      "20260824000650_contract_unknown_commit",
      [
        `-- onestar:contract-after ${missingCommit}`,
        "-- onestar:contract-id contract-unknown-commit",
        'TRUNCATE TABLE "AuditLog";',
        "",
      ].join("\n"),
    )

    expect(() => checkMigrationSafety(repository)).toThrow(
      `El commit de preparación declarado en ${migration} ${missingCommit} no existe`,
    )
  })

  it("rechaza migraciones históricas eliminadas o renombradas", () => {
    const repository = createRepository()
    const deletedMigration = addMigration(
      repository.cwd,
      "20260824000700_add_legacy_a",
      'CREATE TABLE "LegacyA" ("id" TEXT PRIMARY KEY);\n',
    )
    const renamedMigration = addMigration(
      repository.cwd,
      "20260824000800_add_legacy_b",
      'CREATE TABLE "LegacyB" ("id" TEXT PRIMARY KEY);\n',
    )
    const base = git(repository.cwd, "rev-parse", "HEAD")
    const renamedDestination = renamedMigration.replace(
      "20260824000800_add_legacy_b",
      "20260824000900_add_legacy_b",
    )
    rmSync(join(repository.cwd, deletedMigration))
    mkdirSync(join(repository.cwd, renamedDestination, ".."), { recursive: true })
    renameSync(
      join(repository.cwd, renamedMigration),
      join(repository.cwd, renamedDestination),
    )
    git(repository.cwd, "add", "--all")
    git(repository.cwd, "commit", "-m", "mutate historical migrations")

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      deletedMigration,
    )
    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${renamedMigration} -> ${renamedDestination}`,
    )
  })

  it("rechaza convertir una migración histórica en symlink", () => {
    const repository = createRepository()
    const migration = addMigration(
      repository.cwd,
      "20260824000950_add_legacy_link",
      'CREATE TABLE "LegacyLink" ("id" TEXT PRIMARY KEY);\n',
    )
    const base = git(repository.cwd, "rev-parse", "HEAD")
    rmSync(join(repository.cwd, migration))
    symlinkSync("../../../README.md", join(repository.cwd, migration))
    git(repository.cwd, "add", migration)
    git(repository.cwd, "commit", "-m", "replace migration with symlink")

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${migration}: migración histórica modificada`,
    )
  })

  it("rechaza una migración nueva almacenada como symlink", () => {
    const repository = createRepository()
    const migration = "prisma/migrations/20260824000975_link/migration.sql"
    mkdirSync(join(repository.cwd, migration, ".."), { recursive: true })
    symlinkSync("../../../README.md", join(repository.cwd, migration))
    git(repository.cwd, "add", migration)
    git(repository.cwd, "commit", "-m", "add symlink migration")

    expect(() => checkMigrationSafety(repository)).toThrow(
      `${migration}: una migración nueva debe ser un archivo regular`,
    )
  })

  it("compara contra el SHA base exacto aunque las ramas diverjan", () => {
    const repository = createRepository()
    git(repository.cwd, "checkout", "-b", "base-branch")
    const migration = addMigration(
      repository.cwd,
      "20260824000990_base_only",
      'CREATE TABLE "BaseOnly" ("id" TEXT PRIMARY KEY);\n',
    )
    const base = git(repository.cwd, "rev-parse", "HEAD")
    git(repository.cwd, "checkout", "main")
    writeFileSync(join(repository.cwd, "app.ts"), "head branch\n")
    git(repository.cwd, "add", "app.ts")
    git(repository.cwd, "commit", "-m", "divergent head")

    expect(() => checkMigrationSafety({ base, cwd: repository.cwd })).toThrow(
      `${migration}: migración histórica eliminada`,
    )
  })

  it("el CLI informa explícitamente cuando no hay migraciones", () => {
    const repository = createRepository()
    const stdout: string[] = []
    const stderr: string[] = []

    expect(
      runCli(["--base", repository.base], {
        cwd: repository.cwd,
        stderr: (message) => stderr.push(message),
        stdout: (message) => stdout.push(message),
      }),
    ).toBe(0)
    expect(stdout.join("\n")).toContain("No hay migraciones nuevas por revisar")
    expect(stderr).toEqual([])
  })

  it("el CLI muestra la advertencia operativa de una contracción válida", () => {
    const repository = createRepository()
    const contractId = "drop-legacy-status"
    const preparation = commitContractManifest(repository.cwd, contractId, {
      checks: completeChecks,
      id: contractId,
      objects: ["type:LegacyStatus"],
      version: 1,
    })
    addMigration(
      repository.cwd,
      "20260824001000_contract_legacy",
      [
        `-- onestar:contract-after ${preparation}`,
        `-- onestar:contract-id ${contractId}`,
        'DROP TYPE "LegacyStatus";',
        "",
      ].join("\n"),
    )
    const stdout: string[] = []

    expect(
      runCli(["--base", preparation], {
        cwd: repository.cwd,
        stdout: (message) => stdout.push(message),
      }),
    ).toBe(0)
    expect(stdout.join("\n")).toContain("CONFIRMA manualmente")
    expect(stdout.join("\n")).toContain(contractId)
    expect(stdout.join("\n")).toContain(preparation)
  })
})
