# Packaging standard

The contract a prototype must meet to live in the Hub. It is served live at `/how-to-ship`.

## A prototype must be self-contained

- Either a single `index.html` with inline CSS and JS, OR a folder with `index.html` plus
  only **relative** assets that travel with it (`./img/logo.png`, `./app.js`).
- No references to files outside the package.
- No `localhost`, no local-disk paths (`C:\...`, `/Users/...`, `file://...`). Those work on
  your machine and break once hosted.
- External CDN links (Google Fonts, a CDN script) are allowed: they load fine from the host.
  Local file references are what break.

## Folder layout

```
prototypes/<slug>/
  index.html         the working copy (what you edit)
  meta.json          gallery metadata (below)
  versions/          created by release.js; do not hand-edit
    versions.json
    v1/index.html    immutable snapshots
    v2/index.html
```

- `slug` (the folder name): kebab-case, permanent, never renamed. It is the stable URL.
- A prototype with no `versions/` still works: the server serves `index.html` directly and
  shows no history. Versioning is opt-in, per prototype.

## Metadata (`meta.json`)

```json
{
  "title": "Checkout flow",
  "product": "Growth",
  "owner": "Your Name",
  "status": "draft",
  "tags": ["checkout", "web"],
  "description": "One line shown on the gallery card."
}
```

- `status`: `draft` (hidden from the gallery, reachable only by direct link), `review`,
  `final`, or `approved`.
- `product`: the group it belongs to; drives the gallery's product filter.
- All fields are optional except that a missing `title` falls back to the slug.

## Versions and change notes

- First release of a slug becomes v1. Re-releasing the same slug becomes v2, v3, ...
- Every version carries a human-written note. It is required, and viewers read it in the
  changelog. Write what changed and why, e.g. "v2: address autofill replaces manual entry."
- `/p/<slug>` always serves the latest released version, never a half-finished working copy.

## Quick self-check before releasing

Open the HTML directly from a different folder (or a fresh browser tab). If anything only
works from its original folder (missing images, broken styles), it is not self-contained yet.
