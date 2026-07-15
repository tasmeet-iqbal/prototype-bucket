// new.js - scaffold a new prototype folder so you can start editing immediately.
// Usage:  node new.js <slug> "Optional Title"
// Creates prototypes/<slug>/index.html (a starter page) and meta.json.
// Then edit index.html, run the server, and (optionally) `node release.js <slug> "v1: ..."`.

const fs = require("fs");
const path = require("path");

const PROTO_DIR = path.join(__dirname, "prototypes");

function die(msg) { console.error("\n  new: " + msg + "\n"); process.exit(1); }

const argv = process.argv.slice(2);
const slug = (argv[0] || "").trim();
const title = argv.slice(1).join(" ").trim() || slug;

if (!slug) die('missing slug. Usage: node new.js <slug> "Title"');
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  die("bad slug: use lowercase letters, digits and dashes, e.g. checkout-redesign.");
}

const dir = path.join(PROTO_DIR, slug);
if (fs.existsSync(dir)) die("prototypes/" + slug + " already exists. Pick another slug.");

fs.mkdirSync(dir, { recursive: true });

const starter = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', Arial, sans-serif;
      color:#1D2939; background:#fff; display:grid; place-items:center; min-height:100vh; }
    .card { text-align:center; padding:40px; }
    h1 { font-size:28px; margin:0 0 8px; }
    p { color:#667085; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>Replace this with your prototype. Keep everything in this one file (inline CSS/JS)
       or add relative assets in this folder.</p>
  </div>
</body>
</html>
`;

const meta = {
  title: title,
  product: "",
  owner: "",
  status: "draft",
  tags: [],
  description: "",
};

fs.writeFileSync(path.join(dir, "index.html"), starter);
fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log("\n  Created prototypes/" + slug + "/");
console.log("  - index.html   (edit this)");
console.log("  - meta.json    (set product, owner, status, description)");
console.log("\n  Next: node server.js  ->  http://localhost:5050/p/" + slug + "\n");
