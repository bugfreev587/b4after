-- name: UpsertIndustryBenchmark :one
INSERT INTO industry_benchmarks (category, metric, value, sample_size, percentiles)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (category, metric) DO UPDATE SET
    value = EXCLUDED.value,
    sample_size = EXCLUDED.sample_size,
    percentiles = EXCLUDED.percentiles,
    calculated_at = now()
RETURNING *;

-- name: GetIndustryBenchmarksByCategory :many
SELECT * FROM industry_benchmarks WHERE category = $1;

-- name: CreateAchievement :exec
INSERT INTO achievements (user_id, type, tenant_id) VALUES ($1, $2, $3)
ON CONFLICT (user_id, type) DO NOTHING;

-- name: ListAchievementsByUserID :many
SELECT * FROM achievements WHERE user_id = $1 ORDER BY achieved_at DESC;

-- Tenant-scoped queries
-- name: ListAchievementsByTenantID :many
SELECT * FROM achievements WHERE tenant_id = $1 ORDER BY achieved_at DESC;
