import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Copy .env.example to .env before database commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/infrastructure/src/postgres/schema.ts",
  out: "./packages/infrastructure/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    schema: "office",
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});
