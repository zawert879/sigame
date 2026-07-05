FROM node:20-alpine

EXPOSE 4000

WORKDIR /app

COPY package*.json ./

COPY yarn.lock ./

COPY tsconfig.json ./

COPY .npmrc ./

COPY src ./src

# COPY siq ./siq

RUN yarn

RUN yarn build

RUN pwd

RUN ls -alh

RUN ls dist -alh

ENV NODE_ENV production

CMD ["node", "/app/dist/si-game-service/src/index.js"]