-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions
SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
