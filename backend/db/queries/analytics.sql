-- name: RecordEvent :exec
INSERT INTO analytics (comparison_id, event_type, device, referrer, country, clerk_user_id)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: GetEventCountsByComparison :many
SELECT event_type, COUNT(*)::int as count
FROM analytics WHERE comparison_id = $1
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
GROUP BY event_type;

-- name: GetDailyViewsByComparison :many
SELECT DATE(created_at) as date, COUNT(*)::int as count
FROM analytics
WHERE comparison_id = $1 AND event_type = 'view'
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;

-- name: GetEventCountsByDevice :many
SELECT device::text as device, COUNT(*)::int as count
FROM analytics
WHERE comparison_id = $1 AND device IS NOT NULL
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
GROUP BY device
ORDER BY count DESC;

-- name: GetEventCountsByReferrer :many
SELECT referrer, COUNT(*)::int as count
FROM analytics
WHERE comparison_id = $1 AND referrer IS NOT NULL AND referrer != ''
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
GROUP BY referrer
ORDER BY count DESC
LIMIT 20;

-- name: GetEventCountsByCountry :many
SELECT country, COUNT(*)::int as count
FROM analytics
WHERE comparison_id = $1 AND country IS NOT NULL AND country != ''
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
GROUP BY country
ORDER BY count DESC
LIMIT 20;

-- name: ListEventsByComparison :many
SELECT id, comparison_id, event_type, device, referrer, country, created_at
FROM analytics
WHERE comparison_id = $1
  AND (clerk_user_id IS NULL OR clerk_user_id != (SELECT user_id FROM comparisons WHERE id = $1))
ORDER BY created_at DESC;
