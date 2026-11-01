# PRINTBADGE.COM · sito web (Dokploy, Coolify o qualsiasi server con Docker)
# 1) compila il sito statico con Vite  2) lo serve con Nginx sulla porta 80.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Facoltativi: si possono anche impostare dopo, come variabili d'ambiente (vedi docker/40-printbadge-config.sh).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_TERMS_URL
ARG VITE_PRIVACY_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/40-printbadge-config.sh /docker-entrypoint.d/40-printbadge-config.sh
RUN chmod +x /docker-entrypoint.d/40-printbadge-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
