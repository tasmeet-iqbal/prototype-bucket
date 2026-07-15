// content.js - read prototypes off disk. Pure filesystem + parsing, no HTML.
// Shared by the live server (reads on every request) and the static builder (reads once).

const fs = require("fs");
const path = require("path");

const PROTO_DIR = path.join(__dirname, "..", "prototypes");

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Format a date in the configured timezone. Store UTC, display local.
function fmtDate(d, tz) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: tz || "UTC",
    });
  } catch (e) {
    // Bad timezone string: fall back to UTC rather than throwing.
    try {
      return date.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "UTC",
      });
    } catch (e2) { return ""; }
  }
}

// Status pill colors. Color carries meaning here, so it is allowed. Each is AA on its own
// fill, and Final vs Approved are now distinct hues (they used to share the same green).
const STATUS_MAP = {
  draft: ["#ECEDEF", "#5A5F66", "Draft"],
  review: ["#F6EAD2", "#7A5300", "In review"],
  final: ["#E4ECF8", "#234C86", "Final"],
  approved: ["#E2F1E6", "#1E6B3B", "Approved"],
};
function statusLabel(status) {
  const m = STATUS_MAP[status];
  return m ? m[2] : (status || "");
}

// Read versions/versions.json for one prototype. Returns { current, versions } or null.
// Degrades to null (no history) on any read/parse error so a bad file never crashes a page.
function readVersions(slug) {
  try {
    const raw = fs.readFileSync(
      path.join(PROTO_DIR, slug, "versions", "versions.json"), "utf8");
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.versions) || data.versions.length === 0) return null;
    const versions = data.versions
      .filter((v) => v && typeof v.v === "number")
      .sort((a, b) => a.v - b.v);
    if (!versions.length) return null;
    let current = data.current;
    if (!versions.find((v) => v.v === current)) current = versions[versions.length - 1].v;
    return { current, versions };
  } catch (e) {
    return null;
  }
}

// Resolve which version to serve. n is optional (string|number). Falls back to current.
function resolveVersion(slug, n) {
  const vs = readVersions(slug);
  if (!vs) return null;
  if (n != null && n !== "") {
    const num = parseInt(n, 10);
    return vs.versions.find((v) => v.v === num) || null;
  }
  return vs.versions.find((v) => v.v === vs.current) || vs.versions[vs.versions.length - 1];
}

// List every prototype (including drafts; callers filter). tz drives the date label.
function listPrototypes(tz) {
  let entries = [];
  try {
    entries = fs.readdirSync(PROTO_DIR, { withFileTypes: true });
  } catch (e) {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const slug = e.name;
    const indexPath = path.join(PROTO_DIR, slug, "index.html");
    if (!fs.existsSync(indexPath)) continue;

    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(PROTO_DIR, slug, "meta.json"), "utf8"));
    } catch (e) {}

    const vs = readVersions(slug);
    let updated = null;
    if (vs) {
      const cur = vs.versions.find((v) => v.v === vs.current);
      if (cur && cur.date) updated = new Date(cur.date);
    }
    if (!updated) {
      try { updated = fs.statSync(indexPath).mtime; } catch (e) {}
    }

    const status = (meta.status || "").toLowerCase();
    out.push({
      slug,
      title: meta.title || slug,
      product: meta.product || "",
      owner: meta.owner || "",
      status,
      statusLabel: statusLabel(status),
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      description: meta.description || "",
      versionCount: vs ? vs.versions.length : 0,
      currentVersion: vs ? vs.current : null,
      updatedMs: updated ? updated.getTime() : 0,
      updatedLabel: updated ? fmtDate(updated, tz) : "",
    });
  }
  out.sort((a, b) => b.updatedMs - a.updatedMs);
  return out;
}

module.exports = {
  PROTO_DIR, esc, fmtDate, statusLabel, STATUS_MAP,
  readVersions, resolveVersion, listPrototypes,
};
