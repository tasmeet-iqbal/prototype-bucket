# syntax=docker/dockerfile:1
# Prototype Bucket: zero-dependency Node app. No install, no build step.
# Prototypes (and their versions/) are baked into the image at build time.
FROM node:22-alpine

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 hub

# Zero npm dependencies, so just copy the app in. .dockerignore keeps it lean.
COPY . .

USER hub

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
