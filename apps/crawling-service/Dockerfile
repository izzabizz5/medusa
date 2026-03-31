FROM node:22-slim AS base
# Playwright needs these system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY apps/crawling-service/package*.json ./apps/crawling-service/
COPY libs/shared/package*.json ./libs/shared/
RUN npm install --workspace=apps/crawling-service --workspace=libs/shared
RUN npx playwright install chromium --with-deps

COPY . .
RUN npm run build --workspace=apps/crawling-service

ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/apps/crawling-service/main"]
