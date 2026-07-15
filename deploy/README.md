# Deploying the Hub

There are two ways to run it. Pick one.

- **Static site** (`node build.js` to `dist/`): host the folder anywhere. No server, no runtime.
  Best for Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, or any nginx. Content updates
  go live through a rebuild.
- **Node server** (`node server.js`): a long-lived process that reads `prototypes/` on every
  request. Best for your own box, Docker, or Kubernetes. Adding a prototype needs no rebuild,
  just a restart (or nothing, if the files are on a mounted volume).

Both serve the exact same pages. Branding is in `hub.config.json`.

---

## Static hosts

### Netlify
`netlify.toml` is already in the repo root. Connect the repo in Netlify and it builds with
`node build.js` and publishes `dist/`. Nothing else to set.

### Vercel
`vercel.json` is in the repo root (build `node build.js`, output `dist`). Import the repo in
Vercel, framework preset "Other". Done.

### GitHub Pages
`.github/workflows/pages.yml` builds and deploys on every push to `main`. One-time: repo
**Settings -> Pages -> Source: GitHub Actions**. The workflow sets `HUB_BASE_PATH` to your
repo name automatically, because project sites are served from `https://<user>.github.io/<repo>/`.
Using a custom domain or a `<user>.github.io` root site? Delete the two `HUB_BASE_PATH` lines.

### Anything else (Cloudflare Pages, S3, nginx, ...)
```bash
node build.js          # writes ./dist
# upload the contents of dist/ to your host
```
If the site is served from a sub-path (e.g. `example.com/prototypes/`), build with
`HUB_BASE_PATH=/prototypes node build.js` so links resolve. Root-hosted needs no base path.

---

## Node server hosts

### Docker
```bash
docker build -t prototype-hub .
docker run --rm -p 3000:3000 prototype-hub      # http://localhost:3000
```

### docker compose
```bash
docker compose up -d                            # http://localhost:3000
```
Uncomment `HUB_BASIC_AUTH` in `docker-compose.yml` to require a login.

### Your own server (Render, Railway, Fly, a VPS, ...)
Any host that runs a Node process works. Start command: `node server.js`. It listens on
`$PORT` (default 5050) and binds `0.0.0.0` in containers. No build step, no dependencies.
On a bare VPS, keep it up with a process manager, e.g. `pm2 start server.js --name hub`.

### Kubernetes (Helm)
A minimal chart lives in `deploy/helm/` (Deployment + Service, non-root, health probes on `/`).

```bash
# 1. Build and push the image to your registry
docker build -t YOUR_REGISTRY/prototype-hub:v1 .
docker push YOUR_REGISTRY/prototype-hub:v1

# 2. Install/upgrade
helm upgrade --install prototype-hub deploy/helm \
  --namespace prototypes --create-namespace \
  --set image.repository=YOUR_REGISTRY/prototype-hub \
  --set image.tag=v1
```
The Service is `ClusterIP`. Point your own ingress (nginx, Traefik, a cloud LB) at it on
port 80. For a private registry, set `imagePullSecrets` in `values.yaml`.

Render the chart without installing to sanity-check it:
```bash
helm template demo deploy/helm --set image.repository=example/prototype-hub --set image.tag=test
```

---

## Access control

The Hub has no login by design: anyone who can reach it sees every non-draft prototype, and
`/raw/<slug>/` exposes the prototype's files. That is fine behind an internal network or an
auth proxy. Options if you need a gate:

- **Server mode:** set `HUB_BASIC_AUTH=user:pass` for simple HTTP basic auth over the whole site.
- **Static mode:** there is no server to enforce auth. Use your host's access control (Netlify
  password protection, Cloudflare Access, an S3 bucket policy, a VPN), or keep the site private.

Do not put an unprotected instance on a public URL if the prototypes are confidential.
