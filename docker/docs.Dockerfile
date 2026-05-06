# --- Mintlify docs dev server ---
FROM node:24-slim@sha256:03eae3ef7e88a9de535496fb488d67e02b9d96a063a8967bae657744ecd513f2

WORKDIR /app

RUN npm i -g mint

COPY . .

EXPOSE 3000

CMD ["mint", "dev", "--host", "0.0.0.0", "--port", "3000"]
