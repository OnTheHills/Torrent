FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY package*.json ./

# pdf-parse → @napi-rs/canvas. On Alpine (musl), npm often installs only the
# *-gnu optional binary, which fails to load and crashes require("pdf-parse").
RUN npm ci --omit=dev \
  && ARCH="$(uname -m)" \
  && case "$ARCH" in \
       aarch64|arm64) npm install @napi-rs/canvas-linux-arm64-musl@0.1.80 --omit=dev --no-save ;; \
       x86_64|amd64) npm install @napi-rs/canvas-linux-x64-musl@0.1.80 --omit=dev --no-save ;; \
     esac

COPY --from=build /app/dist ./dist
# Maintenance and secret-provisioning scripts still run directly from source.
COPY src ./src
COPY scripts ./scripts

EXPOSE 5175

CMD ["npm", "run", "start"]
