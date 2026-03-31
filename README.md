# medusa
yayayayayayayayayayay


URL	What it is
http://localhost:3000	Frontend (register → login → dashboard)
http://localhost:4000/admin/queues	Bull Board — see all queues
http://localhost:4000/auth/register	API test (POST)

# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:link-management

# Terminal 3
npm run dev:crawling

# Terminal 4
npm run dev:matching

# Terminal 5 (GPU/scanning — needs Python running too)
cd apps/scanning-service && python3 python/main.py &
npm run dev:scanning

# Terminal 6
npm run dev:frontend
