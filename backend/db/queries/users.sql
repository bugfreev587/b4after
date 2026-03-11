-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: UpsertUser :one
INSERT INTO users (id, email, name, avatar_url)
VALUES ($1, $2, $3, $4)
ON CONFLICT (id) DO UPDATE SET
    email = CASE WHEN EXCLUDED.email = '' THEN users.email ELSE EXCLUDED.email END,
    name = CASE WHEN EXCLUDED.name = '' THEN users.name ELSE EXCLUDED.name END,
    avatar_url = CASE WHEN EXCLUDED.avatar_url IS NULL THEN users.avatar_url ELSE EXCLUDED.avatar_url END,
    updated_at = now()
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET name = $2, avatar_url = $3 WHERE id = $1 RETURNING *;

-- name: GetUserBySubdomain :one
SELECT * FROM users WHERE custom_subdomain = $1;

-- name: UpdateUserSubdomain :one
UPDATE users SET custom_subdomain = $2 WHERE id = $1 RETURNING *;
