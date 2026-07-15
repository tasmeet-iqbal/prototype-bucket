# Architecture

## What it is

A portal that hosts a collection of HTML prototypes and spec docs. Each prototype gets one
stable link. Ship a new version and the link serves it. Viewers never get a re-shared link.
It renders your HTML the way an artifact viewer does: in an iframe, with a small chrome bar
(title, version dropdown, history, download, fullscreen).

## Two ways to run, one content model

The same `prototypes/` folder feeds both:

- **`node server.js`** - a zero-dependency Node HTTP server. Reads `prototypes/` on every
  request, so adding or changing a prototype needs no restart. Best for local use, your own
  box, Docker, or Kubernetes.
- **`node build.js`** - a static generator. Pre-renders the gallery and every prototype page
  into `./dist`, a plain folder of HTML you can host anywhere (Netlify, Vercel, GitHub Pages,
  Cloudflare, S3, nginx).

Nothing about the content needs a live server: search, filter, and sort are client-side, and
versions are immutable snapshots. The server is a convenience (no rebuild on change); the
static build is for hosts that only serve files.

## Code layout

```
server.js          live server (routing + static file serving)
build.js           static site generator -> dist/
release.js         snapshot the working copy as the next version
new.js             scaffold a new prototype folder
hub.config.json    branding: name, colour, mark, timezone, basePath, font
lib/
  config.js        load config + env overrides
  content.js       read prototypes off disk (list, versions, dates)
  render.js        produce every page (gallery, wrapper, history) from data + config
prototypes/<slug>/ your prototypes (index.html, meta.json, versions/)
docs/              these docs (packaging-standard.md is served at /how-to-ship)
deploy/            Helm chart + the deploy guide
```

`server.js` and `build.js` both render through `lib/render.js`, so the live site and the
static build are byte-for-byte the same pages.

## Routes (server) and their static equivalents

| Route | Serves | Static file |
|-------|--------|-------------|
| `GET /` | Gallery of non-draft prototypes | `index.html` |
| `GET /p/<slug>/` | Latest released version, in the wrapper | `p/<slug>/index.html` |
| `GET /p/<slug>/v/<n>/` | A specific version | `p/<slug>/v/<n>/index.html` |
| `GET /p/<slug>/history` | Standalone changelog | `p/<slug>/history/index.html` |
| `GET /raw/<slug>/...` | A prototype's own files (the iframe source) | `raw/<slug>/...` |
| `GET /how-to-ship` | The packaging standard | `how-to-ship/index.html` |

## Versioning model

Each release copies the working `index.html` (plus any sibling assets) into an immutable
`versions/v<N>/` folder and appends `{ v, dir, entry, date, notes }` to `versions.json`.
Because every version is a full snapshot, every old version stays permanently renderable with
zero runtime dependencies. `/p/<slug>/` serves the `current` version; the working copy is only
used for prototypes that have no versions yet.

## Why zero-dependency

No build step for the app, no framework, no `npm install`. The whole thing is a handful of
plain Node files plus your HTML. It starts instantly, the Docker image is tiny, and there is
almost nothing to break or patch.
