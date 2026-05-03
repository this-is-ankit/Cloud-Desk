# ---- Stage 1: Build the Vite app ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args for Vite (baked into the static bundle at build time)
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_STREAM_API_KEY
ARG VITE_ENABLE_DEV_AUTH=false

RUN npm run build

# ---- Stage 2: Serve with nginx ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
