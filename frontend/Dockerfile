FROM node:22.20.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
