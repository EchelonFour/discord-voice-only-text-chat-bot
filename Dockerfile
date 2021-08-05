FROM node:14.17-alpine as base
#for node-gyp
RUN apk add python make g++
WORKDIR /bot

COPY package*.json ./
RUN npm ci
# make a seperate node_modules only containing prod dependencies
RUN mkdir -p prod && cp package*.json ./prod && cd prod && npm ci --only=production

COPY . .
RUN npm run build



FROM node:14.17-alpine
RUN apk add --no-cache tzdata dumb-init

WORKDIR /bot

ENV NODE_ENV production

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=base /bot/prod/node_modules ./node_modules
COPY --chown=node:node --from=base /bot/dist ./dist
USER node
CMD ["dumb-init", "node","--enable-source-maps", "dist/main.js"]