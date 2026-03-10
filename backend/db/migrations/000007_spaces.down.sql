-- Remove columns from comparisons
DROP INDEX IF EXISTS idx_comparisons_space_id;
ALTER TABLE comparisons DROP COLUMN IF EXISTS upload_request_id;
ALTER TABLE comparisons DROP COLUMN IF EXISTS source;
ALTER TABLE comparisons DROP COLUMN IF EXISTS space_id;

-- Drop upload_requests
DROP TRIGGER IF EXISTS upload_requests_updated_at ON upload_requests;
DROP TABLE IF EXISTS upload_requests;

-- Drop spaces
DROP TRIGGER IF EXISTS spaces_updated_at ON spaces;
DROP TABLE IF EXISTS spaces;

-- Drop enums
DROP TYPE IF EXISTS comparison_source;
DROP TYPE IF EXISTS upload_request_sent_via;
DROP TYPE IF EXISTS upload_request_status;
DROP TYPE IF EXISTS upload_request_type;
DROP TYPE IF EXISTS cta_type;
