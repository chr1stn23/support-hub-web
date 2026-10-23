# Etapa 1: compilar
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

# Capa de dependencias: solo se invalida si cambian los archivos de paquetes
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# La configuración de producción es la de por defecto; aquí se aplican los presupuestos de tamaño
RUN npx ng build

# ---------- Etapa 2: servir ----------
# En producción, fija la versión (o el resumen sha256) en lugar de "stable-alpine"
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/*/browser /usr/share/nginx/html

# Se sustituyen en el arranque, al generar la configuración a partir de la plantilla
ENV BACKEND_URL=http://backend:8080 \
    DNS_RESOLVER=127.0.0.11

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
