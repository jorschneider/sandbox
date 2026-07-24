/* Copy the CRUX web app (../boulder) into ./www and inject the native bridge.
   The PWA source in boulder/ is never modified. Run via `npm run build:web`. */
import { rm, cp, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));   // crux-app/scripts
const appRoot = join(here, "..");                       // crux-app
const src = join(appRoot, "..", "boulder");             // repo/boulder
const dest = join(appRoot, "www");

// fresh copy
await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });

// drop web-host-only files that have no meaning inside the app bundle
for (const f of ["vercel.json", ".vercel"]) {
  const p = join(dest, f);
  if (existsSync(p)) await rm(p, { recursive: true, force: true });
}

// add the native bridge and wire it into index.html (before the manifest script)
await copyFile(join(appRoot, "native-bridge.js"), join(dest, "native-bridge.js"));
const indexPath = join(dest, "index.html");
let html = await readFile(indexPath, "utf8");
const anchor = '<script src="audio/manifest.js"></script>';
const inject = '<script src="native-bridge.js"></script>\n';
if (!html.includes('src="native-bridge.js"')) {
  if (html.includes(anchor)) html = html.replace(anchor, inject + anchor);
  else html = html.replace("</head>", inject + "</head>");
  await writeFile(indexPath, html);
}

console.log("✓ web assets copied to www/ and native bridge injected");
