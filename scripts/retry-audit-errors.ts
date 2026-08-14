#!/usr/bin/env tsx
/**
 * Retry audit for materials that previously errored.
 * Usage:
 *   npx tsx scripts/retry-audit-errors.ts --grade SD_5 [--apply]
 */
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    grade: get("--grade"),
    apply: args.includes("--apply"),
  };
}

async function main() {
  const { grade, apply } = parseArgs();
  if (!grade) {
    console.error("Usage: npx tsx scripts/retry-audit-errors.ts --grade SD_5 [--apply]");
    process.exit(1);
  }

  const reportDir = join(process.cwd(), "audit-reports");
  const files = readdirSync(reportDir)
    .filter((f) => f.endsWith(`-${grade}-audit.json`))
    .sort();
  if (files.length === 0) {
    console.error(`No audit report found for ${grade}`);
    process.exit(1);
  }
  const reportPath = join(reportDir, files[files.length - 1]);
  const report = JSON.parse(readFileSync(reportPath, "utf-8"));

  const errorIds = report.results
    .filter((r: any) => r.error)
    .map((r: any) => r.materialId);

  console.log(`Found ${errorIds.length} errored materials in ${reportPath}`);
  if (errorIds.length === 0) {
    console.log("Nothing to retry.");
    return;
  }

  const args = ["scripts/audit-content.ts", "--grade", grade];
  if (apply) args.push("--apply");

  return new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      stdio: "inherit",
      env: { ...process.env, AUDIT_ONLY_IDS: errorIds.join(",") },
      cwd: process.cwd(),
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Retry process exited with code ${code}`));
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
