-- name: CreateReview :one
INSERT INTO reviews (comparison_id, space_id, user_id, reviewer_name, reviewer_photo_url, reviewer_contact, rating, content, tenant_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetReviewByID :one
SELECT * FROM reviews WHERE id = $1;

-- name: ListReviewsByUserIDs :many
SELECT * FROM reviews WHERE user_id = ANY($1::text[]) ORDER BY created_at DESC;

-- name: ListPublishedReviewsByUserID :many
SELECT * FROM reviews WHERE user_id = $1 AND status = 'published' ORDER BY created_at DESC LIMIT $2;

-- name: CountReviewsByUserID :one
SELECT COUNT(*) FROM reviews WHERE user_id = $1;

-- name: UpdateReviewStatus :exec
UPDATE reviews SET status = $2 WHERE id = $1;

-- name: UpdateReviewReply :exec
UPDATE reviews SET reply = $2, reply_at = now() WHERE id = $1;

-- name: DeleteReview :exec
DELETE FROM reviews WHERE id = $1;

-- name: GetReviewStats :one
SELECT COUNT(*) AS total, COALESCE(AVG(rating), 0)::float AS avg_rating,
       COUNT(*) FILTER (WHERE status = 'published') AS published_count
FROM reviews WHERE user_id = $1;

-- Tenant-scoped queries
-- name: ListReviewsByTenantID :many
SELECT * FROM reviews WHERE tenant_id = $1 ORDER BY created_at DESC;

-- name: CountReviewsByTenantID :one
SELECT COUNT(*) FROM reviews WHERE tenant_id = $1;

-- name: GetReviewStatsByTenantID :one
SELECT COUNT(*) AS total, COALESCE(AVG(rating), 0)::float AS avg_rating,
       COUNT(*) FILTER (WHERE status = 'published') AS published_count
FROM reviews WHERE tenant_id = $1;
