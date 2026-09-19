# --- Mintlify docs dev server ---
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

WORKDIR /app

RUN npm i -g mint

COPY . .

EXPOSE 3000

CMD ["mint", "dev", "--host", "0.0.0.0", "--port", "3000"]
