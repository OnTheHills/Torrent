FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5175

CMD ["npm", "run", "dev"]
