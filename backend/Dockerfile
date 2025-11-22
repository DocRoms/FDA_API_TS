FROM node:24-alpine AS base

WORKDIR /app

# --- Développement : Fastify + tsx watch ---
FROM base AS dev

ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]

# --- Build TypeScript ---
FROM base AS build

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# --- Production : exécuter le code compilé ---
FROM base AS prod

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist

RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
