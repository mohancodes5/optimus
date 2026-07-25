import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prefer DIRECT_URL for CLI migrations; fall back so `prisma generate`
 * still works on Vercel when only DATABASE_URL is set (or neither yet).
 */
const placeholder = "postgresql://user:pass@localhost:5432/postgres";
const datasourceUrl =
  process.env.DIRECT_URL || process.env.DATABASE_URL || placeholder;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: datasourceUrl,
  },
});
