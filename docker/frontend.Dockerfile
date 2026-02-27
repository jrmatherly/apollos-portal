FROM node:22-slim

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
