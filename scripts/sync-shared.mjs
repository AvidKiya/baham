// ---------------------------------------------------------------------------
// sync-shared.mjs — copies shared/*.mjs into functions/_lib/ before build.
// Cloudflare Pages bundles functions/ in isolation (can't import from outside
// the functions dir), so we mirror the shared modules in. Underscore-prefixed
// dirs inside functions/ are never routed — import-only. Runs on every build.
// ---------------------------------------------------------------------------
import { copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "functions", "_lib");
mkdirSync(DEST, { recursive: true });
for (const f of ["config.mjs", "validate.mjs"]) {
  copyFileSync(join(ROOT, "shared", f), join(DEST, f));
  console.log("synced shared/" + f + " → functions/_lib/" + f);
}
