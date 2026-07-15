# Authoring: add and update prototypes

Everything here is plain `node` commands. No account, no build tooling. If you use Claude
Code, `examples/claude-skill/` automates all of it behind `/ship-prototype`.

## Add a new prototype

```bash
node new.js checkout-redesign "Checkout redesign"
```

That scaffolds `prototypes/checkout-redesign/` with a starter `index.html` and a `meta.json`.
Then:

1. Replace `index.html` with your prototype. Keep it self-contained (see
   [packaging-standard.md](packaging-standard.md)).
2. Fill in `meta.json` (product, owner, status, description).
3. Preview: `node server.js`, open `http://localhost:5050/p/checkout-redesign`.

A prototype is visible in the gallery once its `status` is not `draft`. Draft prototypes are
still reachable by direct link, just not listed.

## Already have an HTML file?

Skip `new.js`. Make a folder `prototypes/<slug>/`, drop your `index.html` in it, add a
`meta.json`. The server picks it up on the next request.

## Release a version (optional but recommended)

Versioning gives you a stable "latest" link plus a changelog. Release whenever you want to
publish a change:

```bash
node release.js checkout-redesign "v1: first pass at the express checkout"
```

- First release makes v1, the next makes v2, and so on.
- The note is required. Viewers read it in the version history, so write what changed.
- It refuses a no-op (byte-identical to the last version) unless you pass `--force`.
- Have an existing version-less prototype you want to start tracking? `node release.js <slug>
  --from-legacy` captures the current file as v1.

`/p/<slug>/` always serves the latest released version. Older versions stay at
`/p/<slug>/v/<n>/` and in the History panel.

## Publish it

Depends on how you host (see [../deploy/README.md](../deploy/README.md)):

- **Static host with git CI** (Netlify, Vercel, GitHub Pages): `git add -A && git commit &&
  git push`. CI rebuilds and deploys.
- **Static host, manual**: `node build.js`, then upload `dist/`.
- **Your own server / container**: the running server already serves the new files. Redeploy
  the image if prototypes are baked in.

## Assets (images, extra JS/CSS)

Put them in the prototype's folder and reference them relatively (`./chart.png`). They travel
with each version snapshot, so old versions keep their assets. Do not reference files outside
the folder or anything on your local disk.
