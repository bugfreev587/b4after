-- name: CreateLead :one
INSERT INTO leads (user_id, comparison_id, space_id, type, name, phone, email, service, preferred_date, preferred_time, message, source_url)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: GetLeadByID :one
SELECT * FROM leads WHERE id = $1;

-- name: ListLeadsByUserIDs :many
SELECT * FROM leads WHERE user_id = ANY($1::text[]) ORDER BY created_at DESC;

-- name: UpdateLeadStatus :exec
UPDATE leads SET status = $2 WHERE id = $1;

-- name: CountLeadsByUserIDThisMonth :one
SELECT COUNT(*) FROM leads WHERE user_id = $1 AND created_at >= date_trunc('month', now());

-- name: GetLeadStats :one
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'new') AS new_count,
       COUNT(*) FILTER (WHERE status = 'booked') AS booked_count
FROM leads WHERE user_id = $1;

-- name: GetFormConfig :one
SELECT * FROM form_configs WHERE user_id = $1;

-- name: UpsertFormConfig :one
INSERT INTO form_configs (user_id, form_type, services, whatsapp_number, auto_reply_message)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id) DO UPDATE SET
    form_type = EXCLUDED.form_type,
    services = EXCLUDED.services,
    whatsapp_number = EXCLUDED.whatsapp_number,
    auto_reply_message = EXCLUDED.auto_reply_message
RETURNING *;
