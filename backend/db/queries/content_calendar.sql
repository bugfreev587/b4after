-- name: CreateContentCalendarEntry :one
INSERT INTO content_calendar (user_id, comparison_id, review_id, scheduled_date, content_type, platform, caption_template, tenant_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: ListContentCalendarByDateRange :many
SELECT * FROM content_calendar WHERE user_id = $1 AND scheduled_date >= $2 AND scheduled_date <= $3
ORDER BY scheduled_date ASC, created_at ASC;

-- name: UpdateContentCalendarStatus :exec
UPDATE content_calendar SET status = $2 WHERE id = $1;

-- name: DeleteContentCalendarByDateRange :exec
DELETE FROM content_calendar WHERE user_id = $1 AND scheduled_date >= $2 AND scheduled_date <= $3;

-- name: GetContentCalendarSettings :one
SELECT * FROM content_calendar_settings WHERE user_id = $1;

-- name: UpsertContentCalendarSettings :one
INSERT INTO content_calendar_settings (user_id, weekly_frequency, preferred_platforms, preferred_content_types, tenant_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE SET
    weekly_frequency = EXCLUDED.weekly_frequency,
    preferred_platforms = EXCLUDED.preferred_platforms,
    preferred_content_types = EXCLUDED.preferred_content_types
RETURNING *;

-- Tenant-scoped queries
-- name: ListContentCalendarByTenantID :many
SELECT * FROM content_calendar WHERE tenant_id = $1 AND scheduled_date >= $2 AND scheduled_date <= $3
ORDER BY scheduled_date ASC, created_at ASC;

-- name: GetContentCalendarSettingsByTenantID :one
SELECT * FROM content_calendar_settings WHERE tenant_id = $1;

-- name: UpsertContentCalendarSettingsByTenantID :one
INSERT INTO content_calendar_settings (user_id, weekly_frequency, preferred_platforms, preferred_content_types, tenant_id)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE SET
    weekly_frequency = EXCLUDED.weekly_frequency,
    preferred_platforms = EXCLUDED.preferred_platforms,
    preferred_content_types = EXCLUDED.preferred_content_types
RETURNING *;
