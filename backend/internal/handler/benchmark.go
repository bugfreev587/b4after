package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type BenchmarkHandler struct {
	queries *db.Queries
}

func NewBenchmarkHandler(queries *db.Queries) *BenchmarkHandler {
	return &BenchmarkHandler{queries: queries}
}

// GetUserBenchmark computes a user's metrics and compares them to industry benchmarks.
func (h *BenchmarkHandler) GetUserBenchmark(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	// Get user's review stats
	reviewStats, err := h.queries.GetReviewStats(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get review stats")
		return
	}

	// Get comparison count
	userIDs, _ := middleware.GetAccessibleUserIDs(r.Context(), h.queries, userID)
	comparisons, err := h.queries.ListComparisonsByUserIDs(r.Context(), userIDs)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get comparisons")
		return
	}

	// Compute total views
	var totalViews int64
	for _, c := range comparisons {
		totalViews += int64(c.ViewCount)
	}
	avgViews := float64(0)
	if len(comparisons) > 0 {
		avgViews = float64(totalViews) / float64(len(comparisons))
	}

	result := map[string]any{
		"metrics": map[string]any{
			"total_comparisons": len(comparisons),
			"total_views":       totalViews,
			"avg_views":         avgViews,
			"avg_rating":        reviewStats.AvgRating,
			"total_reviews":     reviewStats.Total,
		},
	}

	// Get industry benchmarks for "other" category as default
	category := "other"
	benchmarks, err := h.queries.GetIndustryBenchmarksByCategory(r.Context(), category)
	if err == nil && len(benchmarks) > 0 {
		benchmarkMap := map[string]any{}
		for _, b := range benchmarks {
			entry := map[string]any{
				"value":       b.Value,
				"sample_size": b.SampleSize,
			}
			// Include percentiles for Pro+ users
			if user.Plan != db.UserPlanFree && b.Percentiles != nil {
				entry["percentiles"] = json.RawMessage(b.Percentiles)
			}
			benchmarkMap[string(b.Metric)] = entry
		}
		result["industry"] = benchmarkMap
	}

	JSON(w, http.StatusOK, result)
}

// GetIndustryBenchmark returns benchmarks for a specific category.
func (h *BenchmarkHandler) GetIndustryBenchmark(w http.ResponseWriter, r *http.Request) {
	category := chi.URLParam(r, "category")
	if category == "" {
		Error(w, http.StatusBadRequest, "category is required")
		return
	}

	benchmarks, err := h.queries.GetIndustryBenchmarksByCategory(r.Context(), category)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get benchmarks")
		return
	}

	result := make([]map[string]any, len(benchmarks))
	for i, b := range benchmarks {
		result[i] = map[string]any{
			"category":    b.Category,
			"metric":      string(b.Metric),
			"value":       b.Value,
			"sample_size": b.SampleSize,
		}
	}
	JSON(w, http.StatusOK, result)
}

// GetAchievements lists achievements and checks for new ones.
func (h *BenchmarkHandler) GetAchievements(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Check and award achievements
	h.checkAchievements(r, userID)

	achievements, err := h.queries.ListAchievementsByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list achievements")
		return
	}

	result := make([]map[string]any, len(achievements))
	for i, a := range achievements {
		result[i] = map[string]any{
			"id":          uuidToString(a.ID),
			"type":        a.Type,
			"achieved_at": a.AchievedAt.Time,
		}
	}
	JSON(w, http.StatusOK, result)
}

func (h *BenchmarkHandler) checkAchievements(r *http.Request, userID string) {
	ctx := r.Context()

	// first_comparison
	userIDs, _ := middleware.GetAccessibleUserIDs(ctx, h.queries, userID)
	comparisons, err := h.queries.ListComparisonsByUserIDs(ctx, userIDs)
	if err == nil && len(comparisons) >= 1 {
		_ = h.queries.CreateAchievement(ctx, db.CreateAchievementParams{UserID: userID, Type: "first_comparison"})
	}

	// first_100_views
	var totalViews int64
	for _, c := range comparisons {
		totalViews += int64(c.ViewCount)
	}
	if totalViews >= 100 {
		_ = h.queries.CreateAchievement(ctx, db.CreateAchievementParams{UserID: userID, Type: "first_100_views"})
	}

	// five_star_pro
	reviewStats, err := h.queries.GetReviewStats(ctx, userID)
	if err == nil && reviewStats.Total >= 5 && reviewStats.AvgRating >= 4.5 {
		_ = h.queries.CreateAchievement(ctx, db.CreateAchievementParams{UserID: userID, Type: "five_star_pro"})
	}
}
