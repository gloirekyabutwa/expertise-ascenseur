-- Migration: 17b3dd817110_add_hardening_retry_tracking_unique_
-- Date: 2026-02-12 17:18:56.208606
-- Description: Add hardening - retry tracking, unique version constraint

-- =============================================================================
-- UPGRADE: Add production hardening features
-- =============================================================================

-- 1. Add unique constraint on document_files to prevent version conflicts
ALTER TABLE document_files 
    ADD CONSTRAINT uq_document_version UNIQUE (document_id, version);

-- 2. Add retry tracking columns to pdf_render_requests
ALTER TABLE pdf_render_requests 
    ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE pdf_render_requests 
    ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 3;

-- =============================================================================
-- DOWNGRADE: Rollback changes
-- =============================================================================

-- To rollback this migration, execute:
-- ALTER TABLE pdf_render_requests DROP COLUMN max_retries;
-- ALTER TABLE pdf_render_requests DROP COLUMN retry_count;
-- ALTER TABLE document_files DROP CONSTRAINT uq_document_version;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify unique constraint exists
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'uq_document_version';

-- Verify new columns exist
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pdf_render_requests' 
    AND column_name IN ('retry_count', 'max_retries');

-- Check for existing version conflicts (should return 0 rows after constraint)
SELECT 
    document_id, 
    version, 
    COUNT(*) as conflict_count
FROM document_files
GROUP BY document_id, version
HAVING COUNT(*) > 1;
