FROM node:20-alpine as dependencies
WORKDIR /si-game-admin
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine as builder
WORKDIR /si-game-admin
COPY . .
COPY --from=dependencies /si-game-admin/node_modules ./node_modules
RUN yarn build

FROM node:20-alpine as runner
WORKDIR /si-game-admin
ENV NODE_ENV production

COPY --from=builder /si-game-admin/public ./public
COPY --from=builder /si-game-admin/package.json ./package.json
COPY --from=builder /si-game-admin/.next ./.next
COPY --from=builder /si-game-admin/node_modules ./node_modules

EXPOSE 3000
CMD ["yarn", "start"]