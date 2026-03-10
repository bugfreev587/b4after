-- name: CreateSpace :one
INSERT INTO spaces (user_id, slug, name, description, category, cover_image_url, services, cta_text, cta_url, cta_type, is_public)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetSpaceByID :one
SELECT * FROM spaces WHERE id = $1;

-- name: GetSpaceBySlug :one
SELECT * FROM spaces WHERE slug = $1;

-- name: ListSpacesByUserID :many
SELECT * FROM spaces WHERE user_id = $1 ORDER BY created_at DESC;

-- name: ListSpacesByUserIDs :many
SELECT * FROM spaces WHERE user_id = ANY($1::text[]) ORDER BY created_at DESC;

-- name: UpdateSpace :one
UPDATE spaces SET
    name = $2, description = $3, category = $4, cover_image_url = $5,
    services = $6, cta_text = $7, cta_url = $8, cta_type = $9, is_public = $10
WHERE id = $1 RETURNING *;

-- name: DeleteSpace :exec
DELETE FROM spaces WHERE id = $1;

-- name: CountSpacesByUserID :one
SELECT COUNT(*) FROM spaces WHERE user_id = $1;

-- name: GetPublicSpaceBySlug :one
SELECT * FROM spaces WHERE slug = $1 AND is_public = true;
