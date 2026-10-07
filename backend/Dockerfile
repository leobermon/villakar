# Backend NestJS para producción. Se construye desde la raíz del repositorio
# (npm workspaces): docker compose lo hace con docker-compose.prod.yml.

FROM node:22-bookworm-slim AS build
# OpenSSL: lo necesita el motor de Prisma.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Primero solo los package.json: Docker reutiliza las dependencias si no cambian.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/booking/package.json frontend/booking/
COPY frontend/admin/package.json frontend/admin/
RUN npm ci --workspace backend --include-workspace-root

COPY backend backend
RUN npm run prisma:generate -w backend && npm run build -w backend

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
# Se conservan las herramientas de Prisma (migraciones y seed del primer usuario).
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/backend backend
WORKDIR /app/backend
USER node
EXPOSE 3000
# Aplica las migraciones pendientes y arranca la API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
