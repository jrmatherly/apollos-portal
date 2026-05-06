# --- Stage 1: Dependencies (dev target) ---
FROM node:24-slim@sha256:03eae3ef7e88a9de535496fb488d67e02b9d96a063a8967bae657744ecd513f2 AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# --- Stage 2: Build ---
FROM deps AS builder

COPY . .

RUN npm run build

# --- Stage 3: Runtime ---
FROM nginx:1.30-alpine@sha256:0272e4604ed93c1792f03695a033a6e8546840f86e0de20a884bb17d2c924883

# SPA routing: serve index.html for all routes, with security headers
# $uri is an nginx variable, not a shell variable
# hadolint ignore=SC2016
RUN printf 'server {\n\
    listen 3000;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    add_header X-Frame-Options "DENY" always;\n\
    add_header X-Content-Type-Options "nosniff" always;\n\
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;\n\
    location = /healthz {\n\
    access_log off;\n\
    add_header Content-Type text/plain;\n\
    return 200 '\''ok'\'';\n\
    }\n\
    location / {\n\
    try_files $uri $uri/ /index.html;\n\
    }\n\
    }\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
