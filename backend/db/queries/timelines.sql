-- name: CreateTimeline :one
INSERT INTO timelines (user_id, space_id, slug, title, description, category, cta_text, cta_url, is_public)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetTimelineByID :one
SELECT * FROM timelines WHERE id = $1;

-- name: GetTimelineBySlug :one
SELECT * FROM timelines WHERE slug = $1;

-- name: GetPublicTimelineBySlug :one
SELECT * FROM timelines WHERE slug = $1 AND is_public = true;

-- name: ListTimelinesByUserIDs :many
SELECT * FROM timelines WHERE user_id = ANY($1::text[]) ORDER BY created_at DESC;

-- name: CountTimelinesByUserID :one
SELECT COUNT(*) FROM timelines WHERE user_id = $1;

-- name: UpdateTimeline :one
UPDATE timelines SET title = $2, description = $3, category = $4, cta_text = $5, cta_url = $6, is_public = $7
WHERE id = $1 RETURNING *;

-- name: DeleteTimeline :exec
DELETE FROM timelines WHERE id = $1;

-- name: CreateTimelineEntry :one
INSERT INTO timeline_entries (timeline_id, image_url, label, date, note, sort_order)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListTimelineEntries :many
SELECT * FROM timeline_entries WHERE timeline_id = $1 ORDER BY sort_order ASC;

-- name: UpdateTimelineEntry :one
UPDATE timeline_entries SET image_url = $2, label = $3, date = $4, note = $5
WHERE id = $1 RETURNING *;

-- name: DeleteTimelineEntry :exec
DELETE FROM timeline_entries WHERE id = $1;

-- name: ReorderTimelineEntry :exec
UPDATE timeline_entries SET sort_order = $2 WHERE id = $1;

-- name: CountTimelineEntriesByTimelineID :one
SELECT COUNT(*) FROM timeline_entries WHERE timeline_id = $1;
