// Post-install cleanup for bun's optional-dependency handling.
//
// Bun 1.3.x records dependency resolutions in bun.lock from the pristine
// manifest of a patched package, so `patchedDependencies` (patches/next@*.patch)
// changes next's on-disk manifest but not the resolved tree. As a result bun
// installs a nested, vulnerable copy of sharp (0.34.x, libvips CVEs) and an old
// postcss (8.4.31) under node_modules/next/node_modules, which would win Node's
// resolution at runtime/build time.
//
// The top-level dependency pins (sharp ^0.35.3, postcss ^8.5.6) are the patched
// versions. Removing the stale nested copies lets next resolve the patched ones
// from the root node_modules.
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const stale = [
  join(process.cwd(), "node_modules", "next", "node_modules", "sharp"),
  join(process.cwd(), "node_modules", "next", "node_modules", "postcss"),
];

for (const dir of stale) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`postinstall: removed stale nested dependency ${dir}`);
  }
}
