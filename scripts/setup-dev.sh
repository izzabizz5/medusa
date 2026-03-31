#!/bin/bash
# Medusa Dev Setup Script
# Run this once after cloning the repo to get everything ready for local development

set -e

echo "==> Setting up Medusa development environment"

# 1. Copy .env files
for service in backend link-management-service crawling-service scanning-service matching-service; do
  if [ ! -f "apps/$service/.env" ]; then
    cp "apps/$service/.env.example" "apps/$service/.env"
    echo "    Created apps/$service/.env (review and fill in values)"
  fi
done

if [ ! -f "apps/frontend/.env.local" ]; then
  cp apps/frontend/.env.example apps/frontend/.env.local
  echo "    Created apps/frontend/.env.local"
fi

# 2. Install Node dependencies
echo "==> Installing Node.js dependencies..."
npm install

# 3. Start Docker services (PostgreSQL + Redis + FlareSolverr)
echo "==> Starting Docker services (postgres, redis, flaresolverr)..."
docker compose up -d postgres redis
echo "    Waiting for PostgreSQL to be healthy..."
until docker compose exec -T postgres pg_isready -U medusa -d medusa 2>/dev/null; do
  sleep 2
done
echo "    PostgreSQL is ready"

# 4. Install Python dependencies for scanning sidecar
if command -v pip3 &>/dev/null; then
  echo "==> Installing Python dependencies..."
  pip3 install -r apps/scanning-service/python/requirements.txt
else
  echo "    Skipping Python install (pip3 not found)"
fi

# 5. Install Playwright browsers for crawling service
echo "==> Installing Playwright browsers..."
cd apps/crawling-service && npx playwright install chromium --with-deps 2>/dev/null || true
cd ../..

echo ""
echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit apps/backend/.env and fill in JWT_SECRET and object storage credentials"
echo "  2. Start services in separate terminals:"
echo "     npm run dev:backend"
echo "     npm run dev:link-management"
echo "     npm run dev:crawling"
echo "     npm run dev:matching"
echo "     npm run dev:scanning   (requires GPU or runs in CPU mode)"
echo "     npm run dev:frontend"
echo ""
echo "  3. Bull Board UI (queue monitor): http://localhost:4000/admin/queues"
echo "  4. Frontend: http://localhost:3000"
echo "  5. Backend API: http://localhost:4000"
