# Sitio de reservas + panel de administración, servidos por Caddy (HTTPS automático).
# Se construye desde la raíz del repositorio con docker-compose.prod.yml.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/booking/package.json frontend/booking/
COPY frontend/admin/package.json frontend/admin/
RUN npm ci --workspace @cancun-transfers/booking --workspace @cancun-transfers/admin --include-workspace-root

COPY frontend frontend
# URL pública del sitio: el panel la usa para armar los links de pago y el enlace "Ver sitio".
ARG PUBLIC_SITE_URL
ENV VITE_PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN npm run build -w @cancun-transfers/booking && npm run build -w @cancun-transfers/admin

FROM caddy:2-alpine
COPY deploy/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/booking/dist /srv/booking
COPY --from=build /app/frontend/admin/dist /srv/admin
