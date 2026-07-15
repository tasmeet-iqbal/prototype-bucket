// Prototype Bucket - zero-dependency HTML prototype host (live server).
// Run:  node server.js       (then open the printed URL)
// Build a static site instead:  node build.js
//
// Add a prototype:  drop a folder under ./prototypes/<slug>/ with an index.html
//                   (optional meta.json: title, product, owner, status, tags, description)
// Version it:        node release.js <slug> "v2: what changed"
// The URL /p/<slug> is stable and serves the latest released version.

const http = require("http");
const fs = require("fs");
const path = require("path");

const { load } = require("./lib/config");
const {
  esc, listPrototypes, readVersions, resolveVersion, PROTO_DIR,
} = require("./lib/content");
const { galleryHTML, wrapperHTML, historyHTML, howToShipHTML } = require("./lib/render");

const CFG = load();
const PORT = process.env.PORT || 5050;
// Bind all interfaces by default. Containers set HOSTNAME=0.0.0.0; on Windows HOSTNAME is
// the machine name, so only honour it when it looks like an address.
const HOST =
  process.env.HUB_HOST ||
  (process.env.HOSTNAME && /^[\d.:]+$/.test(process.env.HOSTNAME)
    ? process.env.HOSTNAME
    : undefined);

const DOCS_DIR = path.join(__dirname, "docs");

// Optional HTTP basic auth. Set HUB_BASIC_AUTH="user:pass" to gate the whole site.
// Off by default: the Hub is read-only and meant for a trusted/internal audience.
const BASIC_AUTH = process.env.HUB_BASIC_AUTH || "";
function authOk(req) {
  if (!BASIC_AUTH) return true;
  const h = req.headers.authorization || "";
  const m = h.match(/^Basic (.+)$/i);
  if (!m) return false;
  let dec = "";
  try { dec = Buffer.from(m[1], "base64").toString("utf8"); } catch (e) { return false; }
  return dec === BASIC_AUTH;
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
};

function send(res, code, type, body, extraHeaders) {
  const headers = {
    "Content-Type": type,
    "Cache-Control": "no-cache",
    // SAMEORIGIN (not DENY) so the wrapper can iframe a prototype on the same origin.
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
  };
  if (extraHeaders) Object.assign(headers, extraHeaders);
  res.writeHead(code, headers);
  res.end(body);
}

// Serve a static file from a base directory, blocking path traversal.
function serveFromDir(res, baseDir, relPath) {
  let rel = decodeURIComponent(relPath || "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const target = path.normalize(path.join(baseDir, rel));
  if (target !== path.join(baseDir, "index.html") && !target.startsWith(baseDir + path.sep)) {
    return send(res, 403, "text/plain; charset=utf-8", "Forbidden");
  }
  fs.readFile(target, (err, data) => {
    if (err) return send(res, 404, "text/plain; charset=utf-8", "Not found");
    const ext = path.extname(target).toLowerCase();
    send(res, 200, MIME[ext] || "application/octet-stream", data);
  });
}

function serveHowToShip(res) {
  fs.readFile(path.join(DOCS_DIR, "packaging-standard.md"), "utf8", (err, data) => {
    const md = err ? "Packaging standard not found. See docs/packaging-standard.md in the repo." : data;
    send(res, 200, MIME[".html"], howToShipHTML(md, CFG, ""));
  });
}

const server = http.createServer((req, res) => {
  if (!authOk(req)) {
    return send(res, 401, "text/plain; charset=utf-8", "Authentication required", {
      "WWW-Authenticate": 'Basic realm="' + CFG.name.replace(/"/g, "") + '"',
    });
  }

  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  } catch (e) {
    return send(res, 400, "text/plain; charset=utf-8", "Bad request");
  }
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.pathname === "/" || url.pathname === "") {
    return send(res, 200, MIME[".html"], galleryHTML(listPrototypes(CFG.timezone).filter((p) => p.status !== "draft"), CFG, ""));
  }
  if (url.pathname === "/how-to-ship") return serveHowToShip(res);

  // /p/<slug>            latest released version
  // /p/<slug>/v/<n>      a specific version
  // /p/<slug>/history    changelog page
  if (parts[0] === "p" && parts[1]) {
    const slug = decodeURIComponent(parts[1]);
    const p = listPrototypes(CFG.timezone).find((x) => x.slug === slug);
    if (!p) return send(res, 404, "text/plain; charset=utf-8", "Unknown prototype: " + slug);
    const vs = readVersions(slug);
    if (parts[2] === "history") {
      if (!vs) return send(res, 404, "text/plain; charset=utf-8", "No version history for " + slug);
      return send(res, 200, MIME[".html"], historyHTML(p, vs, CFG, ""));
    }
    let n = null;
    if (parts[2] === "v" && parts[3]) n = parts[3];
    else n = url.searchParams.get("v"); // legacy ?v=<n> still works
    const sel = vs ? resolveVersion(slug, n) : null;
    return send(res, 200, MIME[".html"], wrapperHTML(p, sel, vs, CFG, ""));
  }

  // /raw/<slug>/...        the working copy's files (iframe source)
  // /raw/<slug>/v/<n>/...  a specific version's files
  if (parts[0] === "raw" && parts[1]) {
    const slug = decodeURIComponent(parts[1]);
    if (!/^[A-Za-z0-9._-]+$/.test(slug)) return send(res, 400, "text/plain; charset=utf-8", "Bad slug");
    if (parts[2] === "v" && parts[3]) {
      if (!/^\d+$/.test(parts[3])) return send(res, 400, "text/plain; charset=utf-8", "Bad version");
      return serveFromDir(res, path.join(PROTO_DIR, slug, "versions", "v" + parts[3]), parts.slice(4).join("/"));
    }
    return serveFromDir(res, path.join(PROTO_DIR, slug), parts.slice(2).join("/"));
  }

  send(res, 404, "text/plain; charset=utf-8", "Not found");
});

server.listen(PORT, HOST, () => {
  console.log("\n  " + CFG.name + " running");
  console.log("  Gallery:   http://localhost:" + PORT + "/");
  if (BASIC_AUTH) console.log("  Auth:      basic auth ON (HUB_BASIC_AUTH set)");
  for (const p of listPrototypes(CFG.timezone)) {
    console.log("  Prototype: http://localhost:" + PORT + "/p/" + p.slug +
      (p.versionCount ? "  (v" + p.currentVersion + ")" : "  (no versions)"));
  }
  console.log("");
});
