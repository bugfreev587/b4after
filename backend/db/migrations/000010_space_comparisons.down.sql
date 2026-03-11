-- Re-add space_id column to comparisons
ALTER TABLE comparisons ADD COLUMN space_id UUID REFERENCES spaces(id);
CREATE INDEX idx_comparisons_space_id ON comparisons(space_id);

-- Migrate data back (pick first space if multiple)
UPDATE comparisons c
SET space_id = sc.space_id
FROM (
    SELECT DISTINCT ON (comparison_id) comparison_id, space_id
    FROM space_comparisons
    ORDER BY comparison_id, created_at ASC
) sc
WHERE c.id = sc.comparison_id;

-- Drop junction table
DROP TABLE IF EXISTS space_comparisons;
