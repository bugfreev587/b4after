-- name: CreateBrand :one
INSERT INTO brands (user_id, name, logo_url, primary_color, secondary_color, website_url, tenant_id)
VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;

-- name: GetBrandByID :one
SELECT * FROM brands WHERE id = $1;

-- name: ListBrandsByUserID :many
SELECT * FROM brands WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateBrand :one
UPDATE brands SET name = $2, logo_url = $3, primary_color = $4, secondary_color = $5, website_url = $6
WHERE id = $1 RETURNING *;

-- Tenant-scoped queries
-- name: GetBrandByTenantID :one
SELECT * FROM brands WHERE tenant_id = $1 LIMIT 1;

-- name: ListBrandsByTenantID :many
SELECT * FROM brands WHERE tenant_id = $1 ORDER BY created_at DESC;
