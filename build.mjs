// Builds the Chrome Web Store package: node build.mjs
// Copies extension/ to dist/store/, removes the YouTube converter helper (store policy),
// and zips it as dist/producer-reference-grabber-<version>.zip for upload.
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const src = join(root, "extension");
const dist = join(root, "dist");
const out = join(dist, "store");

rmSync(dist, { recursive: true, force: true });
cpSync(src, out, {
  recursive: true,
  filter: (p) => !/(^|[\\/])(\.DS_Store|Thumbs\.db|README\.md)$/.test(p),
});

// Remove the converter helper and its content script entry.
rmSync(join(out, "audioforges.js"), { force: true });
const manifestPath = join(out, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.content_scripts = manifest.content_scripts.filter((c) => !c.js.includes("audioforges.js"));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// Check: nothing in the store build may still reference the converter.
for (const f of readdirSync(out, { recursive: true })) {
  if (!/\.(js|json|html)$/.test(f)) continue;
  const text = readFileSync(join(out, f), "utf8");
  if (/audioforges\.js"\)\s*\)|youtube-to-wav/.test(text) && f !== "library.js") {
    throw new Error(`Store build still references the converter in ${f}`);
  }
}

const zip = join(dist, `producer-reference-grabber-${manifest.version}.zip`);
if (process.platform === "win32") {
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}' -Force`,
  ]);
} else {
  execFileSync("zip", ["-r", "-q", zip, "."], { cwd: out });
}
if (!existsSync(zip)) throw new Error("zip was not created");
console.log(`Built ${zip}`);
console.log(`Content scripts: ${manifest.content_scripts.map((c) => c.js.join(",")).join(" | ")}`);
