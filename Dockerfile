# Stage 1: Build
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_BOOKING_SITE_DOMAIN=site.agendateya.app
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BOOKING_SITE_DOMAIN=$VITE_BOOKING_SITE_DOMAIN
RUN npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
