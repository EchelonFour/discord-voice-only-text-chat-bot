FROM node:14.17-alpine as base
#for node-gyp
RUN apk add python make g++
WORKDIR /bot

COPY package*.json ./

# make a seperate node_modules only containing prod dependencies
RUN npm ci && \
  cp -R node_modules node_modules_dev && \
  npm prune --production && \
  mkdir -p /tmp && \
  mv node_modules /tmp/node_modules_prod && \
  mv node_modules_dev node_modules

COPY . .
RUN npm run build


FROM node:14.17-alpine
RUN apk add --no-cache tzdata dumb-init

WORKDIR /bot

ENV NODE_ENV production

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=base /tmp/node_modules_prod ./node_modules
COPY --chown=node:node --from=base /bot/.dist ./dist
USER node
CMD ["dumb-init", "node","--enable-source-maps", "dist/main.js"]