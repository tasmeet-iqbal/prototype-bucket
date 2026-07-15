// config.js - load hub.config.json, apply defaults, allow env overrides.
// Both server.js and build.js read config through here, so branding lives in one place.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const DEFAULTS = {
  name: "Prototype Bucket",
  // Brand glyph: "bulb" draws a lightbulb icon (default). Set icon to "" to use the `mark`
  // letter instead (white-label fallback).
  icon: "bulb",
  mark: "P", // letter shown in the brand badge when icon is "" (1 to 2 chars)
  tagline: "Share once. Every link serves the latest released version.",
  // Chrome is monochrome graphite; this hex only tints the version badge + favicon, so a
  // white-label consumer can set a real brand hex and the rest stays neutral.
  brandColor: "#2A2D31",
  timezone: "UTC", // IANA name, e.g. "America/New_York", used to display dates
  basePath: "", // set to "/repo-name" for a GitHub Pages project site; "" for root hosting
  font: {
    family: "Space Grotesk",
    // Set cssUrl to "" (or null) to skip the web font and use the system stack (fully offline).
    cssUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
    // Optional serif/display face for page headings only. Leave family empty to use the sans
    // for headings too (which is what the default single-font setup does).
    heading: { family: "", cssUrl: "" },
  },
};

// A basePath must have a leading slash and no trailing slash ("" means root).
function normalizeBase(b) {
  if (b == null) return "";
  b = String(b).trim();
  if (b === "" || b === "/") return "";
  if (!b.startsWith("/")) b = "/" + b;
  return b.replace(/\/+$/, "");
}

function load() {
  let file = {};
  const p = process.env.HUB_CONFIG || path.join(ROOT, "hub.config.json");
  try {
    file = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    // No config file, or unreadable: defaults are fine.
  }

  const cfg = Object.assign({}, DEFAULTS, file);
  cfg.font = Object.assign({}, DEFAULTS.font, file.font || {});

  // Env overrides. Handy in CI (e.g. GitHub Pages needs basePath = /<repo>).
  if (process.env.HUB_BASE_PATH != null) cfg.basePath = process.env.HUB_BASE_PATH;
  if (process.env.HUB_NAME) cfg.name = process.env.HUB_NAME;
  if (process.env.HUB_BRAND_COLOR) cfg.brandColor = process.env.HUB_BRAND_COLOR;

  cfg.basePath = normalizeBase(cfg.basePath);
  return cfg;
}

module.exports = { load, normalizeBase, DEFAULTS };
