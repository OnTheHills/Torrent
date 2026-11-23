FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./

# pdf-parse → @napi-rs/canvas. On Alpine (musl), npm often installs only the
# *-gnu optional binary, which fails to load and crashes require("pdf-parse").
RUN npm install \
  && ARCH="$(uname -m)" \
  && case "$ARCH" in \
       aarch64|arm64) npm install @napi-rs/canvas-linux-arm64-musl@0.1.80 --no-save ;; \
       x86_64|amd64) npm install @napi-rs/canvas-linux-x64-musl@0.1.80 --no-save ;; \
     esac

COPY . .

EXPOSE 5175

CMD ["npm", "run", "dev"]
