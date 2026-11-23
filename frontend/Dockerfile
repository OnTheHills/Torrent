# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Public NEXT_PUBLIC_* values must be present when Next.js builds the browser
# bundle. The env file is mounted for this step, never copied into the image.
RUN --mount=type=secret,id=frontend_build_env,target=/app/.env.production.local npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
