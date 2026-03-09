-- name: CreateGallery :one
INSERT INTO galleries (user_id, title, slug, description)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetGalleryBySlug :one
SELECT * FROM galleries WHERE slug = $1;

-- name: ListGalleriesByUserID :many
SELECT * FROM galleries WHERE user_id = $1 ORDER BY created_at DESC;

-- name: AddComparisonToGallery :exec
INSERT INTO gallery_comparisons (gallery_id, comparison_id, sort_order)
VALUES ($1, $2, $3);

-- name: GetGalleryComparisons :many
SELECT c.* FROM comparisons c
JOIN gallery_comparisons gc ON gc.comparison_id = c.id
WHERE gc.gallery_id = $1
ORDER BY gc.sort_order;
