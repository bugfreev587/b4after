-- name: CreateUploadRequest :one
INSERT INTO upload_requests (space_id, user_id, token, client_name, client_email, client_phone, request_type, instruction_note, service_type, sent_via, tenant_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING *;

-- name: GetUploadRequestByID :one
SELECT * FROM upload_requests WHERE id = $1;

-- name: GetUploadRequestByToken :one
SELECT * FROM upload_requests WHERE token = $1;

-- name: ListUploadRequestsBySpaceID :many
SELECT * FROM upload_requests WHERE space_id = $1 ORDER BY created_at DESC;

-- name: UpdateUploadRequestStatus :one
UPDATE upload_requests SET status = $2 WHERE id = $1 RETURNING *;

-- name: UpdateUploadRequestSubmission :one
UPDATE upload_requests SET
    before_image_url = $2, after_image_url = $3,
    review_rating = $4, review_content = $5,
    status = 'submitted', submitted_at = now()
WHERE id = $1 RETURNING *;

-- name: UpdateUploadRequestReviewed :one
UPDATE upload_requests SET status = $2, reviewed_at = now() WHERE id = $1 RETURNING *;

-- name: UpdateUploadRequestReminderSent :exec
UPDATE upload_requests SET reminder_sent_at = now() WHERE id = $1;

-- name: CountUploadRequestsByUserIDThisMonth :one
SELECT COUNT(*) FROM upload_requests
WHERE user_id = $1 AND created_at >= date_trunc('month', now());

-- Tenant-scoped queries
-- name: ListUploadRequestsByTenantID :many
SELECT * FROM upload_requests WHERE tenant_id = $1 ORDER BY created_at DESC;
