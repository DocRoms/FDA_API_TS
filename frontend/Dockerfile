FROM node:24-alpine AS base

WORKDIR /app

# --- Développement : Vite HMR ---
FROM base AS dev

ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]

# --- Build Vite ---
FROM base AS build

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src ./src

RUN npm run build

# --- Production : Nginx servant les fichiers statiques ---
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
