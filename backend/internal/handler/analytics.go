package handler

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

type AnalyticsHandler struct {
	queries *db.Queries
}

func NewAnalyticsHandler(queries *db.Queries) *AnalyticsHandler {
	return &AnalyticsHandler{queries: queries}
}

type recordEventRequest struct {
	ComparisonID string `json:"comparison_id"`
	EventType    string `json:"event_type"`
	Device       string `json:"device"`
	Referrer     string `json:"referrer"`
	Country      string `json:"country"`
	ClerkUserID  string `json:"clerk_user_id"`
}

func (h *AnalyticsHandler) RecordEvent(w http.ResponseWriter, r *http.Request) {
	var req recordEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	compID, err := uuid.Parse(req.ComparisonID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison_id")
		return
	}

	err = h.queries.RecordEvent(r.Context(), db.RecordEventParams{
		ComparisonID: pgtype.UUID{Bytes: compID, Valid: true},
		EventType:    db.AnalyticsEventType(req.EventType),
		Device:       db.NullDeviceType{DeviceType: db.DeviceType(req.Device), Valid: req.Device != ""},
		Referrer:     pgtype.Text{String: req.Referrer, Valid: req.Referrer != ""},
		Country:      pgtype.Text{String: req.Country, Valid: req.Country != ""},
		ClerkUserID:  pgtype.Text{String: req.ClerkUserID, Valid: req.ClerkUserID != ""},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to record event")
		return
	}

	JSON(w, http.StatusCreated, map[string]string{"status": "recorded"})
}

func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "comparisonId")
	compID, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	pgID := pgtype.UUID{Bytes: compID, Valid: true}

	counts, err := h.queries.GetEventCountsByComparison(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get event counts")
		return
	}

	dailyViews, err := h.queries.GetDailyViewsByComparison(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get daily views")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"event_counts": counts,
		"daily_views":  dailyViews,
	})
}

// GetAdvancedAnalytics returns device, referrer, and country breakdowns + conversion rate.
func (h *AnalyticsHandler) GetAdvancedAnalytics(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "comparisonId")
	compID, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	pgID := pgtype.UUID{Bytes: compID, Valid: true}

	devices, err := h.queries.GetEventCountsByDevice(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get device breakdown")
		return
	}

	referrers, err := h.queries.GetEventCountsByReferrer(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get referrer breakdown")
		return
	}

	countries, err := h.queries.GetEventCountsByCountry(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get country breakdown")
		return
	}

	// Calculate conversion rate (cta_click / view)
	counts, err := h.queries.GetEventCountsByComparison(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get event counts")
		return
	}

	var views, ctaClicks int
	for _, c := range counts {
		switch c.EventType {
		case db.AnalyticsEventTypeView:
			views = int(c.Count)
		case db.AnalyticsEventTypeCtaClick:
			ctaClicks = int(c.Count)
		}
	}

	conversionRate := 0.0
	if views > 0 {
		conversionRate = float64(ctaClicks) / float64(views) * 100
	}

	JSON(w, http.StatusOK, map[string]any{
		"devices":         devices,
		"referrers":       referrers,
		"countries":       countries,
		"conversion_rate": conversionRate,
	})
}

// ExportCSV streams all analytics events as CSV.
func (h *AnalyticsHandler) ExportCSV(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "comparisonId")
	compID, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	pgID := pgtype.UUID{Bytes: compID, Valid: true}

	events, err := h.queries.ListEventsByComparison(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list events")
		return
	}

	w.Header().Set("Content-Type", "text/csv")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="analytics-%s.csv"`, id))

	writer := csv.NewWriter(w)
	writer.Write([]string{"id", "comparison_id", "event_type", "device", "referrer", "country", "created_at"})

	for _, e := range events {
		device := ""
		if e.Device.Valid {
			device = string(e.Device.DeviceType)
		}
		referrer := ""
		if e.Referrer.Valid {
			referrer = e.Referrer.String
		}
		country := ""
		if e.Country.Valid {
			country = e.Country.String
		}
		writer.Write([]string{
			uuidToString(e.ID),
			uuidToString(e.ComparisonID),
			string(e.EventType),
			device,
			referrer,
			country,
			e.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	writer.Flush()
}
