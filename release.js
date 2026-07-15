// release.js - snapshot a prototype's working copy as the next version.
// Usage:  node release.js <slug> "v2: what changed"
// Flags:  --force        release even if nothing changed since the last version
//         --from-legacy  capture an existing version-less prototype as v1 (note optional)
//
// Reads prototypes/<slug>/index.html (+ any sibling assets, excluding meta.json and
// versions/), copies them into prototypes/<slug>/versions/v<N>/, and appends an entry
// to versions.json with the date and your note. Viewers read these notes in the changelog.

const fs = require("fs");
const path = require("path");

const PROTO_DIR = path.join(__dirname, "prototypes");
const PORT = process.env.PORT || 5050;

function die(msg) {
  console.error("\n  release: " + msg + "\n");
  process.exit(1);
}

function listSlugs() {
  try {
    return fs.readdirSync(PROTO_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(PROTO_DIR, e.name, "index.html")))
      .map((e) => e.name);
  } catch (e) { return []; }
}

// Parse args: first non-flag is slug, the rest joined is the note.
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));
const slug = positional[0];
let note = positional.slice(1).join(" ").trim();
const force = flags.has("--force");
const fromLegacy = flags.has("--from-legacy");

if (!slug) die('missing slug. Usage: node release.js <slug> "note". Available: ' + (listSlugs().join(", ") || "none"));
if (!/^[A-Za-z0-9._-]+$/.test(slug)) die("bad slug: use letters, digits, dot, dash, underscore.");

const protoDir = path.join(PROTO_DIR, slug);
const indexPath = path.join(protoDir, "index.html");
if (!fs.existsSync(indexPath)) {
  die("no working index.html at prototypes/" + slug + "/. Available: " + (listSlugs().join(", ") || "none"));
}

const versionsDir = path.join(protoDir, "versions");
const manifestPath = path.join(versionsDir, "versions.json");

// Load or init the manifest.
let manifest = { current: 0, versions: [] };
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!Array.isArray(manifest.versions)) throw new Error("versions[] missing");
  } catch (e) {
    die("versions.json is malformed (" + e.message + "). Fix or remove it before releasing; do not lose history.");
  }
}

const maxV = manifest.versions.reduce((m, v) => Math.max(m, v.v || 0), 0);
const next = maxV + 1;

if (!note) {
  if (fromLegacy && next === 1) note = "Imported existing prototype as v1.";
  else die('a release note is required: viewers read these. Example: node release.js ' + slug + ' "v2: added retry CTA"');
}

// Byte-identical guard: skip a meaningless version unless --force.
if (maxV > 0) {
  const prev = manifest.versions.find((v) => v.v === maxV);
  if (prev) {
    const prevIndex = path.join(versionsDir, prev.dir || ("v" + prev.v), prev.entry || "index.html");
    try {
      if (fs.existsSync(prevIndex) &&
          Buffer.compare(fs.readFileSync(indexPath), fs.readFileSync(prevIndex)) === 0 && !force) {
        die("index.html is byte-identical to v" + maxV + ". Nothing to release. Pass --force to release anyway.");
      }
    } catch (e) {}
  }
}

// Snapshot: copy every child of protoDir except meta.json and versions/ into v<next>/.
// (cpSync refuses to copy a dir into its own subtree, so copy child-by-child.)
const targetDir = path.join(versionsDir, "v" + next);
fs.mkdirSync(targetDir, { recursive: true });
for (const entry of fs.readdirSync(protoDir, { withFileTypes: true })) {
  if (entry.name === "versions" || entry.name === "meta.json") continue;
  const src = path.join(protoDir, entry.name);
  const dst = path.join(targetDir, entry.name);
  if (entry.isDirectory()) fs.cpSync(src, dst, { recursive: true });
  else fs.copyFileSync(src, dst);
}

// Append the version and bump current.
manifest.versions.push({
  v: next,
  dir: "v" + next,
  entry: "index.html",
  date: new Date().toISOString(),
  notes: note,
});
manifest.current = next;

// Atomic write: temp file then rename.
const tmp = manifestPath + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n");
fs.renameSync(tmp, manifestPath);

console.log("\n  Released " + slug + " as v" + next);
console.log("  Note:    " + note);
console.log("  Local:   http://localhost:" + PORT + "/p/" + slug);
console.log("  Rebuild/redeploy (or restart the server) to publish it.\n");
