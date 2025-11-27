# =============================================================================
# Stage 1: Builder - Node.js para compilar la aplicación
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar solo los archivos necesarios primero (para mejor caché)
COPY package*.json ./

# Instalar TODAS las dependencias (necesarias para build) pero skip Cypress binary
ENV CYPRESS_INSTALL_BINARY=0
RUN npm ci --no-audit --no-fund --prefer-offline || \
    npm install --no-audit --no-fund

# Copiar el resto del código fuente
COPY . .

# Generar la build optimizada de producción
RUN npm run build

# =============================================================================
# Stage 2: Runtime - Servir con Nginx
# =============================================================================
FROM nginx:1.27-alpine

# Etiquetas de metadatos
LABEL maintainer="Marketplace Link Team" \
      description="Frontend de Marketplace Link - React + TypeScript + Vite" \
      version="1.0"

# Instalar curl para health checks y limpiar cache
RUN apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Nginx Alpine ya tiene usuario nginx por defecto, solo ajustamos permisos
# (el usuario nginx:nginx ya existe en la imagen base)

# Copiar configuración de Nginx (sobrescribe el default)
COPY nginx.config /etc/nginx/conf.d/default.conf

# Copiar archivos compilados desde la etapa anterior
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Copiar script de entrypoint para configuración runtime
COPY docker-entrypoint.sh /docker-entrypoint.sh
# Strip potential Windows CRLF line endings to avoid shebang '/bin/sh\r' execution failure
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Ajustar permisos en directorios relevantes para usuario nginx
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /etc/nginx/conf.d /tmp/nginx && \
    touch /tmp/nginx/nginx.pid && \
    chown nginx:nginx /tmp/nginx/nginx.pid

# Healthcheck para Nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD curl -f http://localhost:80/ || exit 1

# Exponer puerto 80
EXPOSE 80

# NO usar USER nginx - Nginx necesita root para bind en puerto 80
# El proceso worker de Nginx seguirá ejecutándose como nginx según nginx.conf

# Usar entrypoint que configura variables de entorno en runtime
ENTRYPOINT ["/docker-entrypoint.sh"]
