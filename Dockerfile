FROM node:20-alpine AS admin-deps
WORKDIR /app/si-game-admin-2
COPY si-game-admin-2/package.json si-game-admin-2/yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine AS admin-builder
WORKDIR /app/si-game-admin-2
COPY --from=admin-deps /app/si-game-admin-2/node_modules ./node_modules
COPY common /app/common
COPY si-game-admin-2 ./
RUN yarn build

FROM node:20-alpine AS service-deps
WORKDIR /app/si-game-service
COPY si-game-service/package.json si-game-service/yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:20-alpine AS service-builder
WORKDIR /app/si-game-service
COPY --from=service-deps /app/si-game-service/node_modules ./node_modules
COPY common /app/common
COPY si-game-service ./
RUN yarn build
COPY --from=admin-builder /app/si-game-admin-2/out ./dist/public

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=service-builder /app/si-game-service/package.json ./package.json
COPY --from=service-builder /app/si-game-service/node_modules ./node_modules
COPY --from=service-builder /app/si-game-service/dist ./dist
EXPOSE 4000
CMD ["node", "--inspect", "./dist/si-game-service/src/index.js"]