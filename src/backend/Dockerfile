FROM node:24.22.0-bookworm-slim

WORKDIR /app

# Default to production behavior, including when running outside Compose.
ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "start"]