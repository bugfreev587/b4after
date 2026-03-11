-- name: AddComparisonToSpace :exec
INSERT INTO space_comparisons (space_id, comparison_id, position)
VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING;

-- name: RemoveComparisonFromSpace :exec
DELETE FROM space_comparisons WHERE space_id = $1 AND comparison_id = $2;

-- name: ListComparisonsBySpaceID :many
SELECT c.* FROM comparisons c
JOIN space_comparisons sc ON sc.comparison_id = c.id
WHERE sc.space_id = $1
ORDER BY sc.position ASC, sc.created_at ASC;

-- name: ListPublishedComparisonsBySpaceID :many
SELECT c.* FROM comparisons c
JOIN space_comparisons sc ON sc.comparison_id = c.id
WHERE sc.space_id = $1 AND c.is_published = true
ORDER BY sc.position ASC, sc.created_at ASC;

-- name: CountComparisonsBySpaceID :one
SELECT COUNT(*) FROM space_comparisons WHERE space_id = $1;

-- name: ListSpaceIDsForComparison :many
SELECT space_id FROM space_comparisons WHERE comparison_id = $1;
