import { execFileSync, spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import { pathToFileURL } from "node:url"

export interface MigrationSafetyOptions {
  base: string
  cwd?: string
}

export interface MigrationSafetyResult {
  contractions: ContractApproval[]
  inspectedFiles: string[]
}

export interface ContractApproval {
  after: string
  id: string
  path: string
}

interface CliDependencies {
  cwd?: string
  stderr?: (message: string) => void
  stdout?: (message: string) => void
}

const MIGRATION_PATH = /^prisma\/migrations\/[^/]+\/migration\.sql$/

interface GitChange {
  paths: string[]
  status: string
}

interface SqlToken {
  quoted: boolean
  value: string
}

const REQUIRED_CONTRACT_CHECKS = [
  "applicationNoLongerUsesObjects",
  "backfillCompletedOrNotRequired",
  "backwardCompatibilityVerified",
  "rollbackPlanDocumented",
] as const

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

function resolveCommit(cwd: string, reference: string, label: string): string {
  if (!/^[0-9a-f]{7,40}$/i.test(reference)) {
    throw new Error(`${label} debe ser un SHA Git hexadecimal de 7 a 40 caracteres.`)
  }

  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", `${reference}^{commit}`],
    { cwd, encoding: "utf8" },
  )
  if (result.status !== 0) {
    throw new Error(`${label} ${reference} no existe en el repositorio.`)
  }
  return result.stdout.trim()
}

function isAncestor(cwd: string, ancestor: string, descendant: string): boolean {
  const result = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", ancestor, descendant],
    { cwd, encoding: "utf8" },
  )
  if (result.status === 0) return true
  if (result.status === 1) return false
  throw new Error(result.stderr.trim() || "Git no pudo validar la relación entre commits.")
}

function readFileAtCommit(
  cwd: string,
  commit: string,
  path: string,
): Buffer | null {
  const result = spawnSync("git", ["show", `${commit}:${path}`], {
    cwd,
  })
  return result.status === 0 ? result.stdout : null
}

function commitCreatedOrUpdatedPath(
  cwd: string,
  commit: string,
  path: string,
): boolean {
  const [, firstParent] = git(cwd, "rev-list", "--parents", "-n", "1", commit).split(
    " ",
  )
  const changedPaths = (
    firstParent
      ? git(
          cwd,
          "diff",
          "--name-only",
          "--diff-filter=AM",
          "-z",
          firstParent,
          commit,
          "--",
          path,
        )
      : git(
          cwd,
          "diff-tree",
          "--root",
          "--no-commit-id",
          "--name-only",
          "--diff-filter=AM",
          "-r",
          "-z",
          commit,
          "--",
          path,
        )
  ).split("\0")
  return changedPaths.includes(path)
}

function pathChangedBetweenCommits(
  cwd: string,
  preparation: string,
  base: string,
  path: string,
): boolean {
  return (
    git(
      cwd,
      "rev-list",
      "--full-history",
      `${preparation}..${base}`,
      "--",
      path,
    ).length > 0
  )
}

function validateContractManifest(content: Buffer, contractId: string): string[] {
  let manifest: unknown
  try {
    manifest = JSON.parse(content.toString("utf8"))
  } catch {
    throw new Error("el archivo no contiene JSON válido")
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("la raíz debe ser un objeto JSON")
  }

  const record = manifest as Record<string, unknown>
  const topLevelKeys = Object.keys(record).sort()
  if (topLevelKeys.join(",") !== "checks,id,objects,version") {
    throw new Error("las claves requeridas son version, id, objects y checks")
  }
  if (record.version !== 1) {
    throw new Error("version debe ser 1")
  }
  if (record.id !== contractId) {
    throw new Error(`id debe coincidir con contract-id (${contractId})`)
  }
  if (
    !Array.isArray(record.objects) ||
    record.objects.length === 0 ||
    record.objects.some(
      (object) =>
        typeof object !== "string" || object.length === 0 || object !== object.trim(),
    ) ||
    new Set(record.objects).size !== record.objects.length
  ) {
    throw new Error("objects debe contener identificadores únicos y no vacíos")
  }
  if (!record.checks || typeof record.checks !== "object" || Array.isArray(record.checks)) {
    throw new Error("checks debe ser un objeto")
  }
  const checks = record.checks as Record<string, unknown>
  const checkKeys = Object.keys(checks).sort()
  if (checkKeys.join(",") !== [...REQUIRED_CONTRACT_CHECKS].sort().join(",")) {
    throw new Error("checks no coincide con el checklist requerido")
  }
  for (const check of REQUIRED_CONTRACT_CHECKS) {
    if (checks[check] !== true) {
      throw new Error(`checks.${check} debe ser true`)
    }
  }
  return record.objects as string[]
}

function parseGitChanges(diff: string): GitChange[] {
  if (!diff) return []

  const fields = diff.split("\0")
  const changes: GitChange[] = []
  let index = 0
  while (index < fields.length && fields[index]) {
    const status = fields[index]
    index += 1
    const pathCount = status.startsWith("R") || status.startsWith("C") ? 2 : 1
    const paths = fields.slice(index, index + pathCount)
    index += pathCount
    changes.push({ paths, status })
  }
  return changes
}

function isEscapeStringPrefix(sql: string, quoteIndex: number): boolean {
  const prefixIndex = quoteIndex - 1
  if (prefixIndex < 0 || !/[eE]/.test(sql[prefixIndex])) return false
  return prefixIndex === 0 || !/[A-Za-z0-9_$]/.test(sql[prefixIndex - 1])
}

function stripSqlComments(sql: string, lineComments: string[] = []): string {
  let output = ""
  let index = 0
  const mask = (character: string): string =>
    character === "\n" || character === "\r" ? character : " "

  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      const commentStart = index
      while (index < sql.length && !/[\r\n]/.test(sql[index])) {
        output += " "
        index += 1
      }
      lineComments.push(sql.slice(commentStart, index))
      continue
    }

    if (sql.startsWith("/*", index)) {
      let depth = 0
      while (index < sql.length) {
        if (sql.startsWith("/*", index)) {
          depth += 1
          output += "  "
          index += 2
          continue
        }
        if (sql.startsWith("*/", index)) {
          depth -= 1
          output += "  "
          index += 2
          if (depth === 0) break
          continue
        }
        output += mask(sql[index])
        index += 1
      }
      continue
    }

    const quote = sql[index]
    if (quote === "'" || quote === '"') {
      const backslashEscapes = quote === "'" && isEscapeStringPrefix(sql, index)
      output += quote === '"' ? "q" : "s"
      index += 1
      while (index < sql.length) {
        const character = sql[index]
        if (character === quote) {
          if (sql[index + 1] === quote) {
            output += "  "
            index += 2
            continue
          }
          output += " "
          index += 1
          break
        }
        if (backslashEscapes && character === "\\" && index + 1 < sql.length) {
          output += "  "
          index += 2
          continue
        }
        output += mask(character)
        index += 1
      }
      continue
    }

    if (quote === "$") {
      const delimiter = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0]
      if (delimiter) {
        const closingIndex = sql.indexOf(delimiter, index + delimiter.length)
        if (closingIndex !== -1) {
          const end = closingIndex + delimiter.length
          output += "s"
          index += 1
          while (index < end) {
            output += mask(sql[index])
            index += 1
          }
          continue
        }
      }
    }

    output += sql[index]
    index += 1
  }

  return output
}

function extractContractMarkers(sql: string): string[] {
  const lineComments: string[] = []
  stripSqlComments(sql, lineComments)
  return lineComments.flatMap((comment) => {
    const match = comment.match(/^--\s*onestar:contract-after\s+([0-9a-f]{7,40})\s*$/i)
    return match ? [match[1]] : []
  })
}

function extractContractIds(sql: string): string[] {
  const lineComments: string[] = []
  stripSqlComments(sql, lineComments)
  return lineComments.flatMap((comment) => {
    const match = comment.match(/^--\s*onestar:contract-id\s+(\S+)\s*$/i)
    return match ? [match[1]] : []
  })
}

function tokenizeExecutableSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = []
  let index = 0

  while (index < sql.length) {
    if (sql.startsWith("--", index)) {
      while (index < sql.length && !/[\r\n]/.test(sql[index])) index += 1
      continue
    }
    if (sql.startsWith("/*", index)) {
      let depth = 0
      while (index < sql.length) {
        if (sql.startsWith("/*", index)) {
          depth += 1
          index += 2
        } else if (sql.startsWith("*/", index)) {
          depth -= 1
          index += 2
          if (depth === 0) break
        } else {
          index += 1
        }
      }
      continue
    }
    if (sql[index] === "'") {
      const backslashEscapes = isEscapeStringPrefix(sql, index)
      tokens.push({ quoted: true, value: "<string>" })
      index += 1
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2
        } else if (sql[index] === "'") {
          index += 1
          break
        } else if (backslashEscapes && sql[index] === "\\" && index + 1 < sql.length) {
          index += 2
        } else {
          index += 1
        }
      }
      continue
    }
    if (sql[index] === "$") {
      const delimiter = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0]
      if (delimiter) {
        const closingIndex = sql.indexOf(delimiter, index + delimiter.length)
        if (closingIndex !== -1) {
          tokens.push({ quoted: true, value: "<string>" })
          index = closingIndex + delimiter.length
          continue
        }
      }
    }
    if (sql[index] === '"') {
      let value = ""
      index += 1
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          value += '"'
          index += 2
        } else if (sql[index] === '"') {
          index += 1
          break
        } else {
          value += sql[index]
          index += 1
        }
      }
      tokens.push({ quoted: true, value })
      continue
    }
    if (/[A-Za-z_]/.test(sql[index])) {
      const start = index
      index += 1
      while (index < sql.length && /[A-Za-z0-9_$]/.test(sql[index])) index += 1
      tokens.push({ quoted: false, value: sql.slice(start, index).toLowerCase() })
      continue
    }
    if (/[0-9]/.test(sql[index])) {
      while (index < sql.length && /[0-9_]/.test(sql[index])) index += 1
      tokens.push({ quoted: true, value: "<number>" })
      continue
    }
    if (".,;()*".includes(sql[index])) {
      tokens.push({ quoted: false, value: sql[index] })
    }
    index += 1
  }

  return tokens
}

function isKeyword(token: SqlToken | undefined, keyword: string): boolean {
  return token !== undefined && !token.quoted && token.value === keyword.toLowerCase()
}

function readQualifiedName(
  tokens: SqlToken[],
  start: number,
): { name: string; next: number } | null {
  const first = tokens[start]
  if (!first || (!first.quoted && !/^[a-z_][a-z0-9_$]*$/.test(first.value))) {
    return null
  }
  const parts = [first.value]
  let index = start + 1
  while (tokens[index]?.value === ".") {
    const next = tokens[index + 1]
    if (!next || (!next.quoted && !/^[a-z_][a-z0-9_$]*$/.test(next.value))) break
    parts.push(next.value)
    index += 2
  }
  return {
    name: parts
      .map((part) => encodeURIComponent(part).replaceAll(".", "%2E"))
      .join("."),
    next: index,
  }
}

function skipKeywords(tokens: SqlToken[], start: number, keywords: string[]): number {
  let index = start
  for (const keyword of keywords) {
    if (!isKeyword(tokens[index], keyword)) return start
    index += 1
  }
  return index
}

function splitStatements(tokens: SqlToken[]): SqlToken[][] {
  const statements: SqlToken[][] = []
  let current: SqlToken[] = []
  for (const token of tokens) {
    if (token.value === ";") {
      if (current.length > 0) statements.push(current)
      current = []
    } else {
      current.push(token)
    }
  }
  if (current.length > 0) statements.push(current)
  return statements
}

function detectUnverifiableTopLevelSql(sql: string): string[] {
  return splitStatements(tokenizeExecutableSql(sql)).flatMap((statement) => {
    if (isKeyword(statement[0], "do")) return ["DO"]
    if (isKeyword(statement[0], "call")) return ["CALL"]
    return []
  })
}

function splitTopLevelClauses(tokens: SqlToken[]): SqlToken[][] {
  const clauses: SqlToken[][] = []
  let current: SqlToken[] = []
  let depth = 0
  for (const token of tokens) {
    if (token.value === "(") depth += 1
    if (token.value === ")") depth = Math.max(0, depth - 1)
    if (token.value === "," && depth === 0) {
      clauses.push(current)
      current = []
    } else {
      current.push(token)
    }
  }
  if (current.length > 0) clauses.push(current)
  return clauses
}

function readNameListTargets(
  tokens: SqlToken[],
  start: number,
  prefix: "table" | "type",
): string[] {
  const targets: string[] = []
  let index = start
  while (index < tokens.length) {
    if (isKeyword(tokens[index], "only")) index += 1
    const parsed = readQualifiedName(tokens, index)
    if (!parsed) break
    targets.push(`${prefix}:${parsed.name}`)
    index = parsed.next
    if (tokens[index]?.value === "*") index += 1
    if (tokens[index]?.value !== ",") break
    index += 1
  }
  return targets
}

function parseAlterTableStatement(
  statement: SqlToken[],
): { clauses: SqlToken[][]; table: string } | null {
  if (!isKeyword(statement[0], "alter") || !isKeyword(statement[1], "table")) {
    return null
  }
  let index = 2
  const afterIfExists = skipKeywords(statement, index, ["if", "exists"])
  if (afterIfExists !== index) index = afterIfExists
  if (isKeyword(statement[index], "only")) index += 1
  const table = readQualifiedName(statement, index)
  if (!table) return null
  index = table.next
  if (statement[index]?.value === "*") index += 1
  return {
    clauses: splitTopLevelClauses(statement.slice(index)),
    table: table.name,
  }
}

function extractAlterTableTargets(statement: SqlToken[]): string[] {
  const parsedStatement = parseAlterTableStatement(statement)
  if (!parsedStatement) return []

  const targets: string[] = []
  for (const clause of parsedStatement.clauses) {
    let actionIndex = 0
    if (isKeyword(clause[actionIndex], "drop")) {
      actionIndex += 1
      if (isKeyword(clause[actionIndex], "constraint")) {
        actionIndex += 1
        const afterConstraintIfExists = skipKeywords(clause, actionIndex, ["if", "exists"])
        if (afterConstraintIfExists !== actionIndex) actionIndex = afterConstraintIfExists
        const constraint = readQualifiedName(clause, actionIndex)
        if (constraint) {
          targets.push(`constraint:${parsedStatement.table}.${constraint.name}`)
        }
        continue
      }
      if (isKeyword(clause[actionIndex], "column")) actionIndex += 1
      const afterColumnIfExists = skipKeywords(clause, actionIndex, ["if", "exists"])
      if (afterColumnIfExists !== actionIndex) actionIndex = afterColumnIfExists
      const column = readQualifiedName(clause, actionIndex)
      if (column) targets.push(`column:${parsedStatement.table}.${column.name}`)
      continue
    }
    if (isKeyword(clause[actionIndex], "rename")) {
      actionIndex += 1
      if (isKeyword(clause[actionIndex], "to")) {
        targets.push(`table:${parsedStatement.table}`)
        continue
      }
      if (isKeyword(clause[actionIndex], "column")) actionIndex += 1
      const column = readQualifiedName(clause, actionIndex)
      if (column) targets.push(`column:${parsedStatement.table}.${column.name}`)
      continue
    }
    if (isKeyword(clause[actionIndex], "alter")) {
      actionIndex += 1
      if (isKeyword(clause[actionIndex], "column")) actionIndex += 1
      const column = readQualifiedName(clause, actionIndex)
      if (!column) continue
      const remainder = clause.slice(column.next)
      const isTypeChange = remainder.some((token) => isKeyword(token, "type"))
      const isSetNotNull = remainder.some(
        (token, tokenIndex) =>
          isKeyword(token, "set") &&
          isKeyword(remainder[tokenIndex + 1], "not") &&
          isKeyword(remainder[tokenIndex + 2], "null"),
      )
      if (isTypeChange || isSetNotNull) {
        targets.push(`column:${parsedStatement.table}.${column.name}`)
      }
      continue
    }
  }
  return targets
}

function findUnsafeRequiredColumnTargets(sql: string): string[] {
  const addedColumns = new Map<
    string,
    {
      generator: "identity" | "serial" | null
      hasCompatibleDefault: boolean
      required: boolean
    }
  >()
  const serialTypes = new Set([
    "smallserial",
    "serial",
    "bigserial",
    "serial2",
    "serial4",
    "serial8",
  ])
  for (const statement of splitStatements(tokenizeExecutableSql(sql))) {
    const parsedStatement = parseAlterTableStatement(statement)
    if (!parsedStatement) continue
    for (const clause of parsedStatement.clauses) {
      let index = 0
      if (isKeyword(clause[index], "add")) {
        index += 1
        if (isKeyword(clause[index], "column")) index += 1
        const afterIfNotExists = skipKeywords(clause, index, ["if", "not", "exists"])
        if (afterIfNotExists !== index) index = afterIfNotExists
        if (isKeyword(clause[index], "constraint")) {
          index += 1
          const constraintName = readQualifiedName(clause, index)
          if (!constraintName) continue
          index = constraintName.next
        }
        if (
          isKeyword(clause[index], "primary") &&
          isKeyword(clause[index + 1], "key")
        ) {
          index += 2
          while (index < clause.length && clause[index].value !== "(") index += 1
          index += 1
          while (index < clause.length && clause[index].value !== ")") {
            const primaryColumn = readQualifiedName(clause, index)
            if (!primaryColumn) {
              index += 1
              continue
            }
            const target = `column:${parsedStatement.table}.${primaryColumn.name}`
            const state = addedColumns.get(target)
            if (state) state.required = true
            index = primaryColumn.next
            if (clause[index]?.value === ",") index += 1
          }
          continue
        }
        const column = readQualifiedName(clause, index)
        if (!column) continue
        const target = `column:${parsedStatement.table}.${column.name}`
        const remainder = clause.slice(column.next)
        const hasNotNull = remainder.some(
          (token, tokenIndex) =>
            isKeyword(token, "not") && isKeyword(remainder[tokenIndex + 1], "null"),
        )
        const hasPrimaryKey = remainder.some(
          (token, tokenIndex) =>
            isKeyword(token, "primary") && isKeyword(remainder[tokenIndex + 1], "key"),
        )
        const defaultIndex = remainder.findIndex(
          (token, tokenIndex) =>
            isKeyword(token, "default") &&
            !isKeyword(remainder[tokenIndex - 1], "set") &&
            !isKeyword(remainder[tokenIndex - 1], "by"),
        )
        let defaultValueIndex = defaultIndex + 1
        while (remainder[defaultValueIndex]?.value === "(") defaultValueIndex += 1
        const hasCompatibleDefault =
          defaultIndex !== -1 &&
          remainder[defaultValueIndex] !== undefined &&
          !isKeyword(remainder[defaultValueIndex], "null")
        const hasSerialGenerator =
          remainder[0] !== undefined &&
          !remainder[0].quoted &&
          serialTypes.has(remainder[0].value)
        const hasIdentityGenerator = remainder.some(
          (token, tokenIndex) =>
            isKeyword(token, "generated") &&
            ((isKeyword(remainder[tokenIndex + 1], "always") &&
              isKeyword(remainder[tokenIndex + 2], "as") &&
              isKeyword(remainder[tokenIndex + 3], "identity")) ||
              (isKeyword(remainder[tokenIndex + 1], "by") &&
                isKeyword(remainder[tokenIndex + 2], "default") &&
                isKeyword(remainder[tokenIndex + 3], "as") &&
                isKeyword(remainder[tokenIndex + 4], "identity"))),
        )
        addedColumns.set(target, {
          generator: hasIdentityGenerator
            ? "identity"
            : hasSerialGenerator
              ? "serial"
              : null,
          hasCompatibleDefault,
          required: hasNotNull || hasPrimaryKey,
        })
        continue
      }

      if (!isKeyword(clause[index], "alter")) continue
      index += 1
      if (isKeyword(clause[index], "column")) index += 1
      const column = readQualifiedName(clause, index)
      if (!column) continue
      const target = `column:${parsedStatement.table}.${column.name}`
      const remainder = clause.slice(column.next)
      const dropsDefault = remainder.some(
        (token, tokenIndex) =>
          isKeyword(token, "drop") && isKeyword(remainder[tokenIndex + 1], "default"),
      )
      const setsDefaultNull = remainder.some((token, tokenIndex) => {
        if (
          !isKeyword(token, "set") ||
          !isKeyword(remainder[tokenIndex + 1], "default")
        ) {
          return false
        }
        let valueIndex = tokenIndex + 2
        while (remainder[valueIndex]?.value === "(") valueIndex += 1
        return isKeyword(remainder[valueIndex], "null")
      })
      const dropsIdentity = remainder.some(
        (token, tokenIndex) =>
          isKeyword(token, "drop") && isKeyword(remainder[tokenIndex + 1], "identity"),
      )
      const state = addedColumns.get(target)
      if (dropsDefault && state) {
        state.hasCompatibleDefault = false
        if (state.generator === "serial") state.generator = null
      }
      if (setsDefaultNull && state) {
        state.hasCompatibleDefault = false
        if (state.generator === "serial") state.generator = null
      }
      if (dropsIdentity && state?.generator === "identity") {
        state.generator = null
      }
    }
  }
  return [...addedColumns]
    .filter(
      ([, state]) =>
        state.required && !state.hasCompatibleDefault && state.generator === null,
    )
    .map(([target]) => target)
    .sort()
}

function extractDestructiveTargets(sql: string): string[] {
  const targets: string[] = [...findUnsafeRequiredColumnTargets(sql)]
  for (const statement of splitStatements(tokenizeExecutableSql(sql))) {
    if (isKeyword(statement[0], "alter") && isKeyword(statement[1], "table")) {
      targets.push(...extractAlterTableTargets(statement))
      continue
    }
    if (isKeyword(statement[0], "drop") && isKeyword(statement[1], "table")) {
      let index = 2
      const afterIfExists = skipKeywords(statement, index, ["if", "exists"])
      if (afterIfExists !== index) index = afterIfExists
      targets.push(...readNameListTargets(statement, index, "table"))
      continue
    }
    if (isKeyword(statement[0], "drop") && isKeyword(statement[1], "type")) {
      let index = 2
      const afterIfExists = skipKeywords(statement, index, ["if", "exists"])
      if (afterIfExists !== index) index = afterIfExists
      targets.push(...readNameListTargets(statement, index, "type"))
      continue
    }
    if (isKeyword(statement[0], "truncate")) {
      const index = isKeyword(statement[1], "table") ? 2 : 1
      targets.push(...readNameListTargets(statement, index, "table"))
      continue
    }
    if (isKeyword(statement[0], "rename") && isKeyword(statement[1], "table")) {
      const oldName = readQualifiedName(statement, 2)
      if (oldName) targets.push(`table:${oldName.name}`)
    }
  }
  return [...new Set(targets)].sort()
}

function contractIdsAtCommit(cwd: string, commit: string): Set<string> {
  const paths = git(
    cwd,
    "ls-tree",
    "-r",
    "--name-only",
    "-z",
    commit,
    "--",
    "prisma/migrations",
  )
    .split("\0")
    .filter((path) => MIGRATION_PATH.test(path))
  return new Set(
    paths.flatMap((path) => {
      const content = readFileAtCommit(cwd, commit, path)
      return content ? extractContractIds(content.toString("utf8")) : []
    }),
  )
}

export function detectDestructiveOperations(sql: string): string[] {
  const executableSql = stripSqlComments(sql)
  const rules: Array<[label: string, pattern: RegExp]> = [
    ["DROP TABLE", /\bDROP\s+TABLE\b/i],
    [
      "DROP COLUMN",
      /\b(?:DROP\s+COLUMN|ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?\S+(?:\s+\*)?\s+DROP\s+(?:IF\s+EXISTS\s+)?(?!CONSTRAINT\b)\S+)/i,
    ],
    ["DROP TYPE", /\bDROP\s+TYPE\b/i],
    ["DROP CONSTRAINT", /\bDROP\s+CONSTRAINT\b/i],
    [
      "RENAME TABLE",
      /\b(?:RENAME\s+TABLE|ALTER\s+TABLE\b[^;]*\bRENAME\s+TO)\b/i,
    ],
    [
      "RENAME COLUMN",
      /\b(?:RENAME\s+COLUMN|ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?\S+(?:\s+\*)?\s+RENAME\s+(?:COLUMN\s+)?\S+\s+TO\s+\S+)/i,
    ],
    ["TRUNCATE", /\bTRUNCATE(?:\s+TABLE)?\b/i],
    [
      "ALTER COLUMN TYPE",
      /\bALTER\s+(?:COLUMN\s+)?\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i,
    ],
    ["SET NOT NULL", /\bSET\s+NOT\s+NULL\b/i],
  ]

  const operations = rules
    .filter(([, pattern]) => pattern.test(executableSql))
    .map(([label]) => label)
  if (findUnsafeRequiredColumnTargets(sql).length > 0) {
    operations.push("ADD COLUMN NOT NULL")
  }

  return operations
}

export function checkMigrationSafety({
  base,
  cwd = process.cwd(),
}: MigrationSafetyOptions): MigrationSafetyResult {
  const resolvedBase = resolveCommit(cwd, base, "El SHA base")
  const diff = git(
    cwd,
    "diff",
    "--name-status",
    "--find-renames",
    "-z",
    `${resolvedBase}..HEAD`,
    "--",
    "prisma/migrations",
  )
  const changes = parseGitChanges(diff).filter(({ paths }) =>
    paths.some((path) => MIGRATION_PATH.test(path)),
  )
  const violations = changes.flatMap(({ paths, status }) => {
    if (status === "M") {
      return [`${paths[0]}: migración histórica modificada`]
    }
    if (status === "D") {
      return [`${paths[0]}: migración histórica eliminada`]
    }
    if (status.startsWith("R")) {
      return [`${paths.join(" -> ")}: migración histórica renombrada`]
    }
    if (status !== "A") {
      return [`${paths[0]}: migración histórica modificada (estado Git ${status})`]
    }
    return []
  })

  if (violations.length > 0) {
    throw new Error(
      `${violations.join("\n")}\nCrea una migración forward-only nueva; las migraciones aplicadas son inmutables.`,
    )
  }

  const inspectedFiles = changes
    .filter(({ status }) => status === "A")
    .map(({ paths }) => paths[0])
  const migrationSql = new Map(
    inspectedFiles.map((path) => [path, git(cwd, "show", `HEAD:${path}`)]),
  )
  const newContractIdPaths = new Map<string, string[]>()
  for (const [path, sql] of migrationSql) {
    for (const contractId of extractContractIds(sql)) {
      newContractIdPaths.set(contractId, [
        ...(newContractIdPaths.get(contractId) ?? []),
        path,
      ])
    }
  }
  for (const [contractId, paths] of newContractIdPaths) {
    if (paths.length > 1) {
      throw new Error(
        `${paths[1]}: contract-id ${contractId} está duplicado en migraciones nuevas.`,
      )
    }
  }
  const contractions: ContractApproval[] = []
  let consumedContractIds: Set<string> | null = null

  for (const path of inspectedFiles) {
    const mode = git(cwd, "ls-tree", "HEAD", "--", path).split(/\s+/, 1)[0]
    if (!mode.startsWith("100")) {
      throw new Error(`${path}: una migración nueva debe ser un archivo regular, no ${mode}.`)
    }
    const sql = migrationSql.get(path) ?? ""
    const unverifiableStatements = detectUnverifiableTopLevelSql(sql)
    if (unverifiableStatements.length > 0) {
      throw new Error(
        `${path}: ${unverifiableStatements.join(", ")} top-level no es verificable por el gate.`,
      )
    }
    const operations = detectDestructiveOperations(sql)
    if (operations.length === 0) continue

    const markers = extractContractMarkers(sql)
    if (markers.length !== 1) {
      throw new Error(
        operations
          .map((operation) => `${path}: ${operation} incompatible sin preparación previa`)
          .concat(
            `${path}: agrega exactamente un marcador -- onestar:contract-after <sha> verificable.`,
          )
          .join("\n"),
      )
    }
    const contractIds = extractContractIds(sql)
    if (contractIds.length !== 1) {
      throw new Error(
        `${path}: agrega exactamente un marcador -- onestar:contract-id <id> verificable.`,
      )
    }

    const marker = markers[0]
    const contractId = contractIds[0]
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contractId)) {
      throw new Error(
        `${path}: contract-id debe usar kebab-case con letras minúsculas y números.`,
      )
    }
    consumedContractIds ??= contractIdsAtCommit(cwd, resolvedBase)
    if (consumedContractIds.has(contractId)) {
      throw new Error(`${path}: contract-id ${contractId} ya fue consumido en la rama base.`)
    }
    const resolvedPreparation = resolveCommit(
      cwd,
      marker,
      `El commit de preparación declarado en ${path}`,
    )
    if (!isAncestor(cwd, resolvedPreparation, resolvedBase)) {
      throw new Error(
        `${path}: el commit de preparación ${marker} no es ancestro del SHA base ${base}.`,
      )
    }
    const manifestPath = `prisma/migration-contracts/${contractId}.json`
    const manifestAtBase = readFileAtCommit(cwd, resolvedBase, manifestPath)
    if (manifestAtBase === null) {
      throw new Error(`${path}: no existe ${manifestPath} en el SHA base.`)
    }
    const manifestAtHead = readFileAtCommit(cwd, "HEAD", manifestPath)
    if (manifestAtHead === null) {
      throw new Error(`${path}: no existe ${manifestPath} en HEAD.`)
    }
    const manifestAtPreparation = readFileAtCommit(
      cwd,
      resolvedPreparation,
      manifestPath,
    )
    if (manifestAtPreparation === null) {
      throw new Error(
        `${path}: ${manifestPath} no existía en el commit de preparación ${marker}.`,
      )
    }
    if (
      !commitCreatedOrUpdatedPath(
        cwd,
        resolvedPreparation,
        manifestPath,
      )
    ) {
      throw new Error(
        `${path}: ${manifestPath} no fue creado ni actualizado por el commit de preparación ${marker}.`,
      )
    }
    if (!manifestAtBase.equals(manifestAtPreparation)) {
      throw new Error(
        `${path}: ${manifestPath} cambió después del commit de preparación ${marker}; crea un nuevo contrato y una nueva preparación.`,
      )
    }
    if (
      pathChangedBetweenCommits(
        cwd,
        resolvedPreparation,
        resolvedBase,
        manifestPath,
      )
    ) {
      throw new Error(
        `${path}: ${manifestPath} tuvo cambios entre la preparación y el SHA base; crea un contrato nuevo.`,
      )
    }
    if (!manifestAtHead.equals(manifestAtPreparation)) {
      throw new Error(
        `${path}: ${manifestPath} cambió en HEAD; crea un nuevo contrato y una nueva preparación.`,
      )
    }
    if (pathChangedBetweenCommits(cwd, resolvedBase, "HEAD", manifestPath)) {
      throw new Error(
        `${path}: ${manifestPath} tuvo cambios entre el SHA base y HEAD; crea un contrato nuevo.`,
      )
    }
    let manifestObjects: string[]
    try {
      manifestObjects = validateContractManifest(manifestAtBase, contractId)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${path}: manifiesto inválido (${reason}).`)
    }
    const destructiveTargets = extractDestructiveTargets(sql)
    if (destructiveTargets.length === 0) {
      throw new Error(
        `${path}: no fue posible derivar objetivos canónicos para el DDL incompatible.`,
      )
    }
    const declaredTargets = [...manifestObjects].sort()
    if (declaredTargets.join("\0") !== destructiveTargets.join("\0")) {
      throw new Error(
        `${path}: objects no coincide con los objetivos del DDL; esperado ${destructiveTargets.join(", ")}.`,
      )
    }
    contractions.push({ after: marker, id: contractId, path })
  }

  return { contractions, inspectedFiles }
}

export function runCli(
  args: string[],
  {
    cwd = process.cwd(),
    stderr = console.error,
    stdout = console.log,
  }: CliDependencies = {},
): number {
  try {
    const { values } = parseArgs({
      allowPositionals: false,
      args,
      options: { base: { type: "string" } },
      strict: true,
    })
    if (!values.base) {
      throw new Error("Falta el argumento obligatorio --base <sha>.")
    }

    const result = checkMigrationSafety({ base: values.base, cwd })
    if (result.inspectedFiles.length === 0) {
      stdout("✓ No hay migraciones nuevas por revisar.")
      return 0
    }

    stdout(
      `✓ Migraciones inspeccionadas:\n${result.inspectedFiles.map((path) => `  - ${path}`).join("\n")}`,
    )
    for (const contraction of result.contractions) {
      stdout(
        [
          `⚠ Contracción autorizada: ${contraction.path}`,
          `  Contract ID: ${contraction.id}`,
          `  Commit de preparación: ${contraction.after}`,
          "  CONFIRMA manualmente que ese commit ya fue desplegado antes de ejecutar prisma migrate deploy.",
        ].join("\n"),
      )
    }
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    stderr(`✗ Gate de seguridad de migraciones rechazado:\n${message}`)
    return 1
  }
}

const invokedPath = process.argv[1]
if (
  invokedPath &&
  import.meta.url === pathToFileURL(resolve(invokedPath)).href
) {
  process.exitCode = runCli(process.argv.slice(2))
}
