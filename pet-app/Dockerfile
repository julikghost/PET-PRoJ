# PET logistics UI — production build + `vite preview` (includes /api/graphql stub via plugin).
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Baked into the client bundle at build time (override at `docker build --build-arg`).
ARG VITE_PET_USER=pet@example.com
ARG VITE_PET_PASSWORD=pet-secret
ARG VITE_PET_ADMIN_USER=pet-admin@example.com
ARG VITE_PET_ADMIN_PASSWORD=pet-admin-secret
ARG VITE_PET_ACCOUNTANT_USER=pet-accountant@example.com
ARG VITE_PET_ACCOUNTANT_PASSWORD=pet-accountant-secret

ENV VITE_PET_USER=$VITE_PET_USER
ENV VITE_PET_PASSWORD=$VITE_PET_PASSWORD
ENV VITE_PET_ADMIN_USER=$VITE_PET_ADMIN_USER
ENV VITE_PET_ADMIN_PASSWORD=$VITE_PET_ADMIN_PASSWORD
ENV VITE_PET_ACCOUNTANT_USER=$VITE_PET_ACCOUNTANT_USER
ENV VITE_PET_ACCOUNTANT_PASSWORD=$VITE_PET_ACCOUNTANT_PASSWORD

RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts vite-plugin-pet-api.ts index.html tsconfig.json ./
COPY src ./src
COPY public ./public
COPY --from=build /app/dist ./dist

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:5173/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
