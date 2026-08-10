FROM node:22.20.0-alpine

WORKDIR /app

COPY package.json ./

RUN npm install -g nodemon
RUN npm install

COPY . .

EXPOSE 5175

CMD ["npm", "run", "dev"]