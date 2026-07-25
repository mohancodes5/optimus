/**
 * Cross-platform prisma generate with env fallbacks for CI/Vercel.
 * `prisma generate` does not need a real DB, but schema/config still
 * resolve DATABASE_URL and DIRECT_URL at load time.
 */
const { execFileSync } = require("node:child_process");

const placeholder = "postgresql://user:pass@localhost:5432/postgres";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL || placeholder;
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL || placeholder;
}

const prismaCli = require.resolve("prisma/build/index.js");

execFileSync(process.execPath, [prismaCli, "generate"], {
  stdio: "inherit",
  env: process.env,
});
