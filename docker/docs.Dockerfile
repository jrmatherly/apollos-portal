# --- Mintlify docs dev server ---
FROM node:24-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553

WORKDIR /app

RUN npm i -g mint

COPY . .

EXPOSE 3000

CMD ["mint", "dev", "--host", "0.0.0.0", "--port", "3000"]
