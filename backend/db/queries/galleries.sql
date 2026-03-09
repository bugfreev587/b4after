-- name: CreateGallery :one
INSERT INTO galleries (user_id, title, slug, description)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: GetGalleryByID :one
SELECT * FROM galleries WHERE id = $1;

-- name: GetGalleryBySlug :one
SELECT * FROM galleries WHERE slug = $1;

-- name: ListGalleriesByUserID :many
SELECT * FROM galleries WHERE user_id = $1 ORDER BY created_at DESC;

-- name: AddComparisonToGallery :exec
INSERT INTO gallery_comparisons (gallery_id, comparison_id, sort_order)
VALUES ($1, $2, $3);

-- name: UpdateGallery :one
UPDATE galleries SET title = $2, description = $3, is_published = $4
WHERE id = $1 RETURNING *;

-- name: DeleteGallery :exec
DELETE FROM galleries WHERE id = $1;

-- name: GetGalleryComparisons :many
SELECT c.* FROM comparisons c
JOIN gallery_comparisons gc ON gc.comparison_id = c.id
WHERE gc.gallery_id = $1
ORDER BY gc.sort_order;

-- name: RemoveComparisonFromGallery :exec
DELETE FROM gallery_comparisons WHERE gallery_id = $1 AND comparison_id = $2;
