package handler

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type ContentCalendarHandler struct {
	queries *db.Queries
}

func NewContentCalendarHandler(queries *db.Queries) *ContentCalendarHandler {
	return &ContentCalendarHandler{queries: queries}
}

func (h *ContentCalendarHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	plan := middleware.GetTenantPlan(r.Context())

	startDate := r.URL.Query().Get("start")
	endDate := r.URL.Query().Get("end")

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		// Default to current week
		now := time.Now()
		start = now.AddDate(0, 0, -int(now.Weekday()))
	}
	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		end = start.AddDate(0, 0, 6)
	}

	entries, err := h.queries.ListContentCalendarByDateRange(r.Context(), db.ListContentCalendarByDateRangeParams{
		UserID:          userID,
		ScheduledDate:   pgtype.Date{Time: start, Valid: true},
		ScheduledDate_2: pgtype.Date{Time: end, Valid: true},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list calendar entries")
		return
	}

	// Free plan: max 3/week
	limit := len(entries)
	if plan == db.UserPlanFree && limit > 3 {
		limit = 3
	}

	result := make([]map[string]any, limit)
	for i := 0; i < limit; i++ {
		result[i] = calendarEntryResponse(entries[i])
	}
	JSON(w, http.StatusOK, result)
}

// Generate creates calendar entries for the given date range based on user's comparisons and reviews.
func (h *ContentCalendarHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())
	plan := middleware.GetTenantPlan(r.Context())

	type generateRequest struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
	}
	var req generateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	start, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid start_date")
		return
	}
	end, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid end_date")
		return
	}

	// Get settings
	settings, err := h.queries.GetContentCalendarSettings(r.Context(), userID)
	weeklyFreq := int32(3)
	platforms := []string{"instagram"}
	contentTypes := []string{"before_after"}
	if err == nil {
		weeklyFreq = settings.WeeklyFrequency
		if settings.PreferredPlatforms != nil {
			_ = json.Unmarshal(settings.PreferredPlatforms, &platforms)
		}
		if settings.PreferredContentTypes != nil {
			_ = json.Unmarshal(settings.PreferredContentTypes, &contentTypes)
		}
	}

	// Free plan limit
	if plan == db.UserPlanFree && weeklyFreq > 3 {
		weeklyFreq = 3
	}

	// Get tenant's comparisons
	comparisons, err := h.queries.ListComparisonsByTenantID(r.Context(), tenantID)
	if err != nil || len(comparisons) == 0 {
		Error(w, http.StatusBadRequest, "no comparisons available to schedule")
		return
	}

	// Delete existing entries in range
	_ = h.queries.DeleteContentCalendarByDateRange(r.Context(), db.DeleteContentCalendarByDateRangeParams{
		UserID:          userID,
		ScheduledDate:   pgtype.Date{Time: start, Valid: true},
		ScheduledDate_2: pgtype.Date{Time: end, Valid: true},
	})

	// Distribute entries across the week
	totalDays := int(end.Sub(start).Hours()/24) + 1
	if totalDays <= 0 {
		totalDays = 7
	}

	captionTemplates := map[string]string{
		"before_after": "Check out this amazing transformation! #beforeandafter",
		"review_quote": "Here's what our clients say about us!",
		"timeline":     "Follow the journey from start to finish!",
		"tip":          "Pro tip for getting the best results!",
	}

	var created []db.ContentCalendar
	for i := int32(0); i < weeklyFreq && int(i) < totalDays; i++ {
		dayOffset := int(i) * totalDays / int(weeklyFreq)
		schedDate := start.AddDate(0, 0, dayOffset)

		ct := contentTypes[rand.Intn(len(contentTypes))]
		platform := platforms[rand.Intn(len(platforms))]
		comp := comparisons[rand.Intn(len(comparisons))]

		caption := captionTemplates[ct]

		entry, err := h.queries.CreateContentCalendarEntry(r.Context(), db.CreateContentCalendarEntryParams{
			UserID:          userID,
			ComparisonID:    comp.ID,
			ScheduledDate:   pgtype.Date{Time: schedDate, Valid: true},
			ContentType:     db.ContentType(ct),
			Platform:        db.ContentPlatform(platform),
			CaptionTemplate: pgtype.Text{String: caption, Valid: true},
			TenantID:        tenantID,
		})
		if err == nil {
			created = append(created, entry)
		}
	}

	result := make([]map[string]any, len(created))
	for i, e := range created {
		result[i] = calendarEntryResponse(e)
	}
	JSON(w, http.StatusOK, result)
}

func (h *ContentCalendarHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid entry id")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.queries.UpdateContentCalendarStatus(r.Context(), db.UpdateContentCalendarStatusParams{
		ID:     pgtype.UUID{Bytes: uid, Valid: true},
		Status: db.CalendarStatus(req.Status),
	}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to update status")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func (h *ContentCalendarHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	settings, err := h.queries.GetContentCalendarSettings(r.Context(), userID)
	if err != nil {
		JSON(w, http.StatusOK, map[string]any{
			"weekly_frequency":        3,
			"preferred_platforms":      []string{"instagram"},
			"preferred_content_types": []string{"before_after"},
		})
		return
	}

	resp := map[string]any{
		"id":               uuidToString(settings.ID),
		"weekly_frequency": settings.WeeklyFrequency,
	}
	if settings.PreferredPlatforms != nil {
		resp["preferred_platforms"] = json.RawMessage(settings.PreferredPlatforms)
	}
	if settings.PreferredContentTypes != nil {
		resp["preferred_content_types"] = json.RawMessage(settings.PreferredContentTypes)
	}
	JSON(w, http.StatusOK, resp)
}

type updateCalendarSettingsRequest struct {
	WeeklyFrequency       int      `json:"weekly_frequency"`
	PreferredPlatforms    []string `json:"preferred_platforms"`
	PreferredContentTypes []string `json:"preferred_content_types"`
}

func (h *ContentCalendarHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())

	var req updateCalendarSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.WeeklyFrequency <= 0 {
		req.WeeklyFrequency = 3
	}

	platformsJSON, _ := json.Marshal(req.PreferredPlatforms)
	contentTypesJSON, _ := json.Marshal(req.PreferredContentTypes)

	settings, err := h.queries.UpsertContentCalendarSettings(r.Context(), db.UpsertContentCalendarSettingsParams{
		UserID:                userID,
		WeeklyFrequency:       int32(req.WeeklyFrequency),
		PreferredPlatforms:    platformsJSON,
		PreferredContentTypes: contentTypesJSON,
		TenantID:              tenantID,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update settings")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"id":                      uuidToString(settings.ID),
		"weekly_frequency":        settings.WeeklyFrequency,
		"preferred_platforms":     json.RawMessage(settings.PreferredPlatforms),
		"preferred_content_types": json.RawMessage(settings.PreferredContentTypes),
	})
}

func calendarEntryResponse(e db.ContentCalendar) map[string]any {
	resp := map[string]any{
		"id":               uuidToString(e.ID),
		"user_id":          e.UserID,
		"content_type":     string(e.ContentType),
		"platform":         string(e.Platform),
		"caption_template": pgtextToPtr(e.CaptionTemplate),
		"status":           string(e.Status),
		"created_at":       e.CreatedAt.Time,
	}
	if e.ScheduledDate.Valid {
		resp["scheduled_date"] = e.ScheduledDate.Time.Format("2006-01-02")
	}
	if e.ComparisonID.Valid {
		resp["comparison_id"] = uuidToString(e.ComparisonID)
	}
	if e.ReviewID.Valid {
		resp["review_id"] = uuidToString(e.ReviewID)
	}
	return resp
}
