# This file prepares the browser app for a web server. It supports a local
# API proxy in Compose and a separately configured API address in deployments.
#
# TLDR: builds the Vite files in Node, then copies them into an Nginx image.
# VITE_API_BASE_URL is embedded in the browser bundle at build time.
FROM node:24.22.0-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
# Install from the lockfile before copying source so source edits can reuse this layer.
RUN npm ci

COPY . .
# Vite embeds this public API address in browser assets at build time.
ARG VITE_API_BASE_URL=""
ARG PEERS_COVERAGE="0"
RUN PEERS_COVERAGE="$PEERS_COVERAGE" VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build
# Only the compiled site and its Nginx config are needed in the serving image.
FROM nginx:1.28.0-alpine AS production

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Keep the default target explicit for ordinary builds.
FROM production AS final
