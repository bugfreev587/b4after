package handler

import (
	"encoding/json"
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
