FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY libs/shared/package*.json ./libs/shared/
RUN npm install --workspace=apps/backend --workspace=libs/shared

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=apps/backend

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/apps/backend/main"]
