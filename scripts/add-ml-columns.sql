-- Migration: Add ML classifier columns to target_urls
-- Run this once against your PostgreSQL database before deploying the new link-management-service

ALTER TABLE target_urls
  ADD COLUMN IF NOT EXISTS ml_score FLOAT,
  ADD COLUMN IF NOT EXISTS ml_label VARCHAR(20),
  ADD COLUMN IF NOT EXISTS auto_discovered BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for pending-review queries (auto-discovered + inactive)
CREATE INDEX IF NOT EXISTS idx_target_urls_pending_review
  ON target_urls (auto_discovered, is_active, ml_score DESC)
  WHERE auto_discovered = TRUE AND is_active = FALSE;
