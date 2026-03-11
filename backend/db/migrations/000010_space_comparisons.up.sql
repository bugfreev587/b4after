-- Create junction table for many-to-many space <-> comparison relationship
CREATE TABLE space_comparisons (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    comparison_id UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (space_id, comparison_id)
);

CREATE INDEX idx_space_comparisons_comparison_id ON space_comparisons(comparison_id);

-- Migrate existing data
INSERT INTO space_comparisons (space_id, comparison_id, position)
SELECT space_id, id, 0 FROM comparisons WHERE space_id IS NOT NULL;

-- Drop old column and index
DROP INDEX IF EXISTS idx_comparisons_space_id;
ALTER TABLE comparisons DROP COLUMN IF EXISTS space_id;
