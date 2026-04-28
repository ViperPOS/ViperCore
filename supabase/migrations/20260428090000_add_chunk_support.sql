-- Add chunk_count and file_size columns to app_releases for chunked downloads
ALTER TABLE app_releases ADD COLUMN IF NOT EXISTS chunk_count integer DEFAULT 1;
ALTER TABLE app_releases ADD COLUMN IF NOT EXISTS file_size bigint;
