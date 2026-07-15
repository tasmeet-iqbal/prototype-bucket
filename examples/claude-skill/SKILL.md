---
name: ship-prototype
description: Package the current HTML prototype and add it to your Prototype Bucket. Use when the user wants to ship, publish, or push a prototype or HTML spec to the hub, or release a new version of one. Works from any folder where a prototype was built.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Ship a prototype to the Prototype Bucket

Take a finished HTML prototype built in this folder, package it to the Hub's standard, copy
it into the Hub repo, snapshot it as a new version with a change note, and publish. The
shared link `/p/<slug>` is stable and always serves the latest released version, so the
user never re-shares a link.

The canonical packaging standard is `docs/packaging-standard.md` in the Hub repo (also served
live at `/how-to-ship`). This skill is that standard, automated.

## Step 1: locate the Hub repo

Resolve the Hub repo directory in this order:
1. `PROTOTYPE_HUB_DIR` environment variable, if set.
2. `hubDir` in this skill's `config.json` (same folder as this file).
3. Ask the user for the path.

Confirm it exists and contains `server.js` and `release.js`. If not, stop and ask.

## Step 2: pick the HTML to ship

- If the user named a file, use it.
- Else look for a single self-contained `.html` in the current folder (the prototype just
  built). If there are several, list them and ask which one.

## Step 3: check it against the packaging standard

A deployable prototype must be self-contained:
- A single `index.html` with inline CSS/JS, OR a folder with `index.html` plus only relative
  assets that travel with it.
- No references to files outside the package, no `localhost` or local-disk paths
  (`C:\...`, `/Users/...`, `file://`).

Scan the HTML for absolute local paths or local file references. If you find any, tell the
user what would break and offer to inline/fix before shipping. External CDN links (fonts, a
CDN script) are fine; local file references are what break.

## Step 4: resolve metadata

Read `.prototype-hub.json` in the current folder if present for defaults (`product`, `owner`,
`tags`). Then determine:
- `slug`: kebab-case, derived from the title unless the user gives one. When shipping a new
  version of an existing prototype, reuse its exact slug. A slug is permanent: never rename.
- `title`: human title for the gallery card.
- `product`: the group it belongs to (drives the gallery filter). From `.prototype-hub.json`, else ask.
- `owner`: from `.prototype-hub.json`, else ask or default to the user.
- `status`: `draft` (hidden from gallery, link-only), `review`, `final`, or `approved`.
  Default `draft` for a first ship unless the user says otherwise.
- `tags`: optional array.
- `description`: one line for the card. Ask if not obvious.
- `note`: REQUIRED. The change description viewers read in the changelog, e.g.
  "v2: added retry CTA on failure". If the user didn't give one, ask. Never invent it.

Show the resolved metadata and the note, and confirm before writing anything.

## Step 5: copy into the Hub

In `<hubDir>/prototypes/<slug>/`:
- If the folder exists and belongs to a different prototype than intended, stop and confirm.
- Copy the chosen HTML to `index.html` (and copy any asset folder alongside it).
- Write/update `meta.json`:

```json
{ "title": "...", "product": "...", "owner": "...", "status": "draft", "tags": [], "description": "..." }
```

## Step 6: release the version

From `<hubDir>`:

```
node release.js <slug> "<note>"
```

This snapshots the working copy into `versions/v<N>/` and records the note + date. First ship
creates v1; re-shipping the same slug creates the next version. If release.js reports the file
is byte-identical to the last version, confirm whether to pass `--force` or skip.

## Step 7: publish

How the Hub goes live depends on how the user hosts it (see the Hub's `deploy/README.md`):

- **Deploys from git** (Netlify, Vercel, GitHub Pages, a CI pipeline): commit and push.
  ```
  git add -A && git commit -m "release(<slug>): <note>" && git push
  ```
- **Local or a self-hosted server**: the running server picks up the new files on the next
  request (no restart needed for content). For a static host without CI, rebuild and redeploy:
  `node build.js` then upload `dist/`.

Ask which applies if you do not know. Do not push if the Hub is not a git-deployed instance.

## Step 8: report

Print:
- The stable shared link. If `hubHost` is set in this skill's `config.json`, it is
  `https://<hubHost>/p/<slug>`. Locally it is `http://localhost:5050/p/<slug>`.
- The version just released and its note.
- That the link auto-updates on the next ship, so no re-share is needed.

## Notes

- Preview locally before shipping: `node server.js` in the Hub, open `http://localhost:5050/p/<slug>`.
- The authoring folder keeps the source/working files. The Hub holds only the packaged
  artifact and its version history.
