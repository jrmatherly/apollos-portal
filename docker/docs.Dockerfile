# --- Mintlify docs dev server ---
FROM node:24-slim

WORKDIR /app

RUN npm i -g mint

COPY . .

EXPOSE 3000

CMD ["mint", "dev", "--host", "0.0.0.0", "--port", "3000"]
