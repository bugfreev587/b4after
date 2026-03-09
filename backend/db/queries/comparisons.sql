-- name: CreateComparison :one
INSERT INTO comparisons (user_id, title, description, slug, category, before_image_url, after_image_url, before_label, after_label, cta_text, cta_url, process_images)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetComparisonByID :one
SELECT * FROM comparisons WHERE id = $1;

-- name: GetComparisonBySlug :one
SELECT * FROM comparisons WHERE slug = $1;

-- name: ListComparisonsByUserID :many
SELECT * FROM comparisons WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateComparison :one
UPDATE comparisons SET
    title = $2, description = $3, category = $4,
    before_image_url = $5, after_image_url = $6,
    before_label = $7, after_label = $8,
    cta_text = $9, cta_url = $10, is_published = $11, process_images = $12
WHERE id = $1 RETURNING *;

-- name: DeleteComparison :exec
DELETE FROM comparisons WHERE id = $1;

-- name: IncrementViewCount :exec
UPDATE comparisons SET view_count = view_count + 1 WHERE id = $1;

-- name: CountComparisonsByUserID :one
SELECT COUNT(*) FROM comparisons WHERE user_id = $1;

-- name: ListComparisonsByUserIDs :many
SELECT * FROM comparisons WHERE user_id = ANY($1::text[]) ORDER BY created_at DESC;

-- name: ListPublishedComparisonsByUserID :many
SELECT * FROM comparisons WHERE user_id = $1 AND is_published = true ORDER BY created_at DESC;
