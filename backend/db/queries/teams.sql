-- name: AddTeamMember :one
INSERT INTO team_members (user_id, team_owner_id, role)
VALUES ($1, $2, $3) RETURNING *;

-- name: ListTeamMembersByOwner :many
SELECT tm.id, tm.user_id, tm.team_owner_id, tm.role, tm.created_at,
       u.email as member_email, u.name as member_name
FROM team_members tm
JOIN users u ON u.id = tm.user_id
WHERE tm.team_owner_id = $1;

-- name: ListTeamsByUserID :many
SELECT tm.id, tm.user_id, tm.team_owner_id, tm.role, tm.created_at,
       u.email as owner_email, u.name as owner_name
FROM team_members tm
JOIN users u ON u.id = tm.team_owner_id
WHERE tm.user_id = $1;

-- name: GetTeamMember :one
SELECT * FROM team_members WHERE id = $1;

-- name: GetTeamMemberByUserAndOwner :one
SELECT * FROM team_members WHERE user_id = $1 AND team_owner_id = $2;

-- name: UpdateTeamMemberRole :one
UPDATE team_members SET role = $2 WHERE id = $1 RETURNING *;

-- name: RemoveTeamMember :exec
DELETE FROM team_members WHERE id = $1;

-- name: GetTeamOwnerIDs :many
SELECT team_owner_id FROM team_members WHERE user_id = $1;
