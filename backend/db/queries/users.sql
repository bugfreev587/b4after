-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: UpsertUser :one
INSERT INTO users (id, email, name, avatar_url)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now()
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name = $2, avatar_url = $3 WHERE id = $1 RETURNING *;

-- name: UpdateUserPlan :exec
UPDATE users SET plan = $2, stripe_customer_id = $3 WHERE id = $1;
