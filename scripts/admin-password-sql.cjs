#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const readline = require("readline");
const bcrypt = require("bcryptjs");

function ask(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askSilent(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let muted = false;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (muted) {
        // Suprimir eco en terminal para no revelar la contraseña
      } else {
        rl.output.write(stringToWrite);
      }
    };
    rl.question(query, (val) => {
      rl.close();
      process.stdout.write("\n");
      resolve(val);
    });
    muted = true;
  });
}

async function main() {
  const emailArg = process.argv[2];
  const email = emailArg ? emailArg.trim().toLowerCase() : await ask("Correo del administrador: ");
  if (!email || !email.includes("@")) {
    console.error("Error: Se requiere un correo electrónico válido.");
    process.exit(1);
  }

  const role = (process.env.ADMIN_ROLE || "SUPER_ADMIN").trim();
  const name = (process.env.ADMIN_NAME || "Admin One Star").trim();

  const password = await askSilent("Contraseña (no se mostrará en pantalla): ");
  if (!password || password.length < 10) {
    console.error("Error: La contraseña debe tener al menos 10 caracteres.");
    process.exit(1);
  }

  const hash = bcrypt.hashSync(password, 10);

  const safeEmail = email.replace(/'/g, "''");
  const safeName = name.replace(/'/g, "''");
  const safeRole = role === "INVENTORY_OPERATOR" ? "INVENTORY_OPERATOR" : "SUPER_ADMIN";

  console.log(`
-- ─────────────────────────────────────────────────────────────────────────────
-- Sentencia SQL generada para restablecer / crear administrador
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO "AdminUser" ("id", "email", "name", "role", "passwordHash", "isActive", "createdAt", "updatedAt")
VALUES (
  'admin_' || lower(substr(md5(random()::text), 1, 16)),
  '${safeEmail}',
  '${safeName}',
  '${safeRole}',
  '${hash}',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "passwordHash" = EXCLUDED."passwordHash",
  "isActive" = true,
  "updatedAt" = NOW();

-- Cerrar sesiones activas previas y sincronizar ba_accounts si existe
DELETE FROM "ba_sessions" WHERE "userId" IN (SELECT "id" FROM "ba_users" WHERE "email" = '${safeEmail}');
UPDATE "ba_accounts" SET "password" = '${hash}', "updatedAt" = NOW() WHERE "accountId" = '${safeEmail}' AND "providerId" = 'credential';
`);
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
