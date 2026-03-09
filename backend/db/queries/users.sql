-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, google_id, avatar_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name = $2, avatar_url = $3 WHERE id = $1 RETURNING *;

-- name: UpdateUserPlan :exec
UPDATE users SET plan = $2, stripe_customer_id = $3 WHERE id = $1;
