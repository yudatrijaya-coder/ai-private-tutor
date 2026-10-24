import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * The datasource URL comes from the environment. It used to be a hardcoded
 * `postgresql://tutor:<password>@...` literal — a real database password
 * committed to a public repository.
 *
 * A `DATABASE_URL` whose password is a placeholder (e.g. `***`) is worse than
 * an absent one: it looks configured, so Prisma reports "authentication
 * failed" instead of saying the value was never filled in. The obvious
 * placeholders are treated as absent and the `PG*` variables are used instead.
 */
const PLACEHOLDER_PASSWORDS: Record<string, true> = {
  "***": true,
  "****": true,
  "xxxxx": true,
  changeme: true,
};

function explicitUrlLooksReal(url: string): boolean {
  try {
    const password = new URL(url).password;
    if (!password) return false;
    return PLACEHOLDER_PASSWORDS[decodeURIComponent(password).toLowerCase()] !== true;
  } catch {
    return false;
  }
}

function datasourceUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit && explicitUrlLooksReal(explicit)) return explicit;

  const host = process.env.PGHOST ?? "localhost";
  const port = process.env.PGPORT ?? "5432";
  const database = process.env.PGDATABASE ?? "ai_private_tutor";
  const user = process.env.PGUSER ?? "tutor";
  const password = process.env.PGPASSWORD;

  if (!password) {
    throw new Error(
      [
        "DATABASE_URL tidak set (atau berisi placeholder) dan PGPASSWORD kosong.",
        "",
        "Prisma CLI butuh kredensial database. Set salah satu:",
        "  • DATABASE_URL=postgresql://user:pass@host:5432/db, atau",
        "  • PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD",
        "",
        "Jalankan `set -a; source .env; set +a` sebelum memanggil prisma.",
      ].join("\n"),
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: datasourceUrl(),
  },
});
