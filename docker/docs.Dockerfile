# --- Mintlify docs dev server ---
FROM node:24-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e

WORKDIR /app

RUN npm i -g mint

COPY . .

EXPOSE 3000

CMD ["mint", "dev", "--host", "0.0.0.0", "--port", "3000"]
