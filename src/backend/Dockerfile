# This file prepares the server that handles browser requests and stores results.
# It uses production settings for local Compose and deployment builds.
#
# TLDR: installs locked production dependencies, copies the backend, and starts
# the Node server on port 5000. Dockerfile.test is the separate test runner.
FROM node:24.22.0-bookworm-slim

WORKDIR /app

# Default to production behavior, including when running outside Compose.
ENV NODE_ENV=production

COPY package.json package-lock.json ./

# Exclude development and test tools from the production image.
RUN npm ci --omit=dev

COPY . .

# Document the API port used by the Compose service and container runtime.
EXPOSE 5000

CMD ["npm", "start"]