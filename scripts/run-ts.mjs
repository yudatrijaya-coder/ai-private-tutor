/**
 * Run a TypeScript file from `scripts/` with the `@/` path alias resolved.
 *
 * WHY THIS EXISTS: the jiti CLI (`npx --no-install jiti <file>`) calls
 * `createJiti(pwd)` with no options, so it does not read `tsconfig.json` and
 * cannot resolve `@/...`. Any src module that imports via the alias (most of
 * `src/lib`) therefore fails with MODULE_NOT_FOUND — `src/lib/curriculum-active.ts`
 * being the first one a script needed.
 *
 * `node_modules/.bin` has no tsx / ts-node / esbuild, so this is the only
 * working way to execute repo TS from a script.
 *
 * Usage: node scripts/run-ts.mjs scripts/check-active-curriculum.ts [args...]
 */
import { createJiti } from "jiti";
import { resolve } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/run-ts.mjs <script.ts> [args...]");
  process.exit(1);
}

const root = process.cwd();

const jiti = createJiti(root, {
  alias: {
    "@": resolve(root, "src"),
  },
});

// Pass the remaining argv through, so the target sees its own arguments.
process.argv = [process.argv[0], resolve(root, target), ...process.argv.slice(3)];

await jiti.import(resolve(root, target));
