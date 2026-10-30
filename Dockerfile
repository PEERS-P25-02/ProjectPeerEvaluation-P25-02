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
RUN if [ "$PEERS_COVERAGE" = "1" ]; then PEERS_COVERAGE=1 VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build -- --sourcemap hidden --minify false; else VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build; fi
# Coverage maps stay outside the served directory, including in the test image.
RUN mkdir -p /coverage-sources/assets && if [ "$PEERS_COVERAGE" = "1" ]; then cp build/assets/* /coverage-sources/assets/ && rm build/assets/*.map; fi

# Only the compiled site and its Nginx config are needed in the serving image.
FROM nginx:1.28.0-alpine AS production

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# Explicit opt-in target exports maps privately through docker cp.
FROM production AS coverage
COPY --from=build /coverage-sources /coverage-sources

# Ordinary builds retain the production target and contain no private maps.
FROM production AS final
