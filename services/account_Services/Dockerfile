FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npx prisma generate

COPY src ./src

EXPOSE 3001

CMD ["node", "src/app.js"]FROM node:22-alpine

# Prisma's engine dynamically links OpenSSL and needs it present in the image.
# Recent Alpine (3.17+) ships OpenSSL 3.0.x, which recent Prisma versions
# support directly - but the `openssl` package itself still has to be
# installed, or generate/migrate fail with "Could not parse schema engine
# response" / "Unable to require libquery_engine...so.node" at build time.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy manifests first so this layer is cached until dependencies actually
# change - editing src/ won't force a full npm ci on the next build.
COPY package*.json ./
RUN npm ci

# @prisma/client ships its own postinstall hook that tries `prisma generate`
# during `npm ci`, above - before the schema exists in this image. That
# attempt fails, but only logs a warning ("postinstall script still succeeds
# but won't generate the Prisma Client"); the explicit generate below is what
# actually produces the client, so the warning is expected noise, not a
# build failure.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY --chown=node:node src ./src
COPY --chown=node:node docker-entrypoint.sh ./
# Strip CRLF in case the file was saved on Windows; a CRLF shebang fails with
# "/bin/sh^M: bad interpreter".
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
# The 'node' user already exists in official Node images (including alpine);
# running as root inside the container is unnecessary privilege.
USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]