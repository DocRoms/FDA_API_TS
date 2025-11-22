# FDA Mini App – Fastify + Vue 3 + Docker

Mini application fullstack basée sur :

- **Backend** : Node 24, TypeScript, Fastify, tsx
- **Frontend** : Vue 3, TypeScript, Vite
- **Outils** : Docker, docker compose, Makefile, ESLint, Vitest (+ coverage)

L’objectif est d’avoir un environnement de développement **100 % dockerisé** : aucune installation de Node ou npm n’est nécessaire sur la machine hôte.

---

## 1. Prérequis

Pour faire tourner le projet, il suffit d’avoir :

- **Docker**
- **make**

> Aucun besoin d’installer Node, npm… Tout est encapsulé dans les conteneurs Docker.

Le projet est structuré ainsi :

- `backend/` : API Fastify (TypeScript)
- `frontend/` : SPA Vue 3 (Vite + TypeScript)
- `docker-compose.yml` : services `backend` et `frontend` en mode dev
- `Makefile` : commandes de haut niveau pour le dev

---

## 2. Commandes Make essentielles

Toutes les commandes suivantes se lancent **depuis la racine** du projet.

### 2.1. Installation des dépendances – `make install`

```bash
make install
```

Cette commande :

1. Construit les images Docker `backend` et `frontend` via `docker compose build`.
2. Exécute `npm install` **à l’intérieur** des conteneurs pour :
   - le backend (`backend`),
   - le frontend (`frontend`).

Tout se fait dans Docker, **sans utiliser npm en local**.

À lancer :

- lors du premier setup,
- après toute modification des `package.json` (ajout de dépendances, outils, etc.).

---

### 2.2. Lancement des envs de devs (front et back) – `make start`

```bash
make start
```

Cette commande :

- lance `docker compose up backend frontend`,
- s’appuie sur les stages `dev` des Dockerfiles :
  - **Backend** : `npm run dev` → Fastify + tsx en mode watch sur `0.0.0.0:3000`.
  - **Frontend** : `npm run dev` → Vite en mode HMR sur `0.0.0.0:5173`.

Une fois la commande lancée :

- API backend : `http://localhost:3000/ping`
  - doit renvoyer un JSON du type : `{ "message": "pong", "timestamp": "..." }`.
- Frontend : `http://localhost:5173`
  - affiche une petite page Vue 3,
  - un bouton permet d’appeler `/api/ping`,
  - Vite proxifie `/api` → service Docker `backend` (`http://backend:3000/ping`),
  - la réponse JSON est affichée dans la page.

Pour arrêter les services :

```bash
make stop
```

---

### 2.3. Exécuter les tests – `make test`

```bash
make test
```

Cette commande exécute les tests **dans Docker**, pour les deux projets :

1. **Backend** :
   - lance `npm run test` dans un conteneur éphémère `backend`,
   - exécute Vitest en environnement Node,
   - inclut des tests (ex. : endpoint `/ping`).

2. **Frontend** :
   - lance `npm run test` dans un conteneur éphémère `frontend`,
   - exécute Vitest en environnement jsdom,
   - inclut des tests sur les composants Vue (ex. : `App.vue`).

Les tests ne nécessitent ni Node ni Vitest installés en local.

> En complément, une commande `make coverage` est disponible pour lancer `vitest --coverage` sur le backend et le frontend, avec des seuils de couverture configurés (80 %). Les rapports sont générés dans `backend/coverage/` et `frontend/coverage/`.

---

## 3. Vue d’ensemble technique

- **Backend**
  - Fastify 4 + `@fastify/cors`
  - Endpoint de test : `GET /ping`
  - TypeScript compilé via `tsc`
  - Dev : `tsx watch src/index.ts`
  - Lint : ESLint + `@typescript-eslint`
  - Tests : Vitest (environment Node, coverage v8)

- **Frontend**
  - Vue 3 + Vite + TypeScript
  - Dev : Vite HMR (port 5173)
  - Proxy `/api` → backend (via nom de service Docker `backend`)
  - Lint : ESLint + `eslint-plugin-vue` + config Vue/TS/Prettier
  - Tests : Vitest (environment jsdom, coverage v8)
