-- name: RecordEvent :exec
INSERT INTO analytics (comparison_id, event_type, device, referrer, country)
VALUES ($1, $2, $3, $4, $5);

-- name: GetEventCountsByComparison :many
SELECT event_type, COUNT(*)::int as count
FROM analytics WHERE comparison_id = $1
GROUP BY event_type;

-- name: GetDailyViewsByComparison :many
SELECT DATE(created_at) as date, COUNT(*)::int as count
FROM analytics
WHERE comparison_id = $1 AND event_type = 'view'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
