// build.js - render the whole Hub to a static ./dist you can host anywhere
// (Vercel, Netlify, GitHub Pages, Cloudflare Pages, S3, any nginx).
//
//   node build.js
//
// Output uses clean folder URLs (/p/<slug>/index.html) and is prefixed with
// config.basePath. For a GitHub Pages project site set basePath to "/repo-name"
// (or run with HUB_BASE_PATH=/repo-name node build.js).

const fs = require("fs");
const path = require("path");

const { load } = require("./lib/config");
const { listPrototypes, readVersions, PROTO_DIR } = require("./lib/content");
const { galleryHTML, wrapperHTML, historyHTML, howToShipHTML } = require("./lib/render");

const CFG = load();
const BASE = CFG.basePath; // normalized: "" or "/something"
const OUT = path.join(__dirname, "dist");
const DOCS_DIR = path.join(__dirname, "docs");

function writeText(rel, content) {
  const dst = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, content);
}

// Copy a prototype's working copy (index.html + sibling assets) into dist/raw/<slug>/,
// excluding meta.json and the versions/ folder. Used for version-less prototypes.
function copyWorkingCopy(slug) {
  const srcDir = path.join(PROTO_DIR, slug);
  const dstDir = path.join(OUT, "raw", slug);
  fs.mkdirSync(dstDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === "versions" || entry.name === "meta.json") continue;
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) fs.cpSync(src, dst, { recursive: true });
    else fs.copyFileSync(src, dst);
  }
}

function howToShipPage() {
  let md = "";
  try { md = fs.readFileSync(path.join(DOCS_DIR, "packaging-standard.md"), "utf8"); }
  catch (e) { md = "Packaging standard not found."; }
  return howToShipHTML(md, CFG, BASE);
}

// ---- run -----------------------------------------------------------------------------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const all = listPrototypes(CFG.timezone);
const shown = all.filter((p) => p.status !== "draft");

// Gallery (drafts hidden, exactly like the live server).
writeText("index.html", galleryHTML(shown, CFG, BASE));
writeText("how-to-ship/index.html", howToShipPage());
// GitHub Pages: skip Jekyll so nothing rewrites our output.
writeText(".nojekyll", "");

let pages = 0;
// Emit a page for every prototype, including drafts: drafts are link-only (not in the
// gallery) but their /p/<slug>/ link still resolves, matching the server's behaviour.
for (const p of all) {
  const vs = readVersions(p.slug);
  const latestSel = vs ? vs.versions.find((v) => v.v === vs.current) : null;

  writeText(`p/${p.slug}/index.html`, wrapperHTML(p, latestSel, vs, CFG, BASE));
  pages++;

  if (vs) {
    writeText(`p/${p.slug}/history/index.html`, historyHTML(p, vs, CFG, BASE));
    for (const v of vs.versions) {
      writeText(`p/${p.slug}/v/${v.v}/index.html`, wrapperHTML(p, v, vs, CFG, BASE));
      pages++;
      const vSrc = path.join(PROTO_DIR, p.slug, "versions", "v" + v.v);
      fs.cpSync(vSrc, path.join(OUT, "raw", p.slug, "v", String(v.v)), { recursive: true });
    }
  } else {
    copyWorkingCopy(p.slug);
  }
}

console.log("\n  Built static site -> " + OUT);
console.log("  Prototypes: " + all.length + " (" + shown.length + " shown, " + (all.length - shown.length) + " draft)");
console.log("  Pages:      " + pages + (BASE ? "   basePath: " + BASE : "   basePath: (root)"));
console.log("  Preview:    npx serve dist   (or any static server)\n");
