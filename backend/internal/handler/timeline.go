package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/service"
)

type TimelineHandler struct {
	queries *db.Queries
}

func NewTimelineHandler(queries *db.Queries) *TimelineHandler {
	return &TimelineHandler{queries: queries}
}

type createTimelineRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	CtaText     string `json:"cta_text"`
	CtaURL      string `json:"cta_url"`
	IsPublic    *bool  `json:"is_public"`
	SpaceID     string `json:"space_id"`
}

func (h *TimelineHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req createTimelineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		Error(w, http.StatusBadRequest, "title is required")
		return
	}

	// Free plan: max 1 timeline
	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}
	if user.Plan == db.UserPlanFree {
		count, err := h.queries.CountTimelinesByUserID(r.Context(), userID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to count timelines")
			return
		}
		if count >= 1 {
			Error(w, http.StatusForbidden, "timeline limit reached — upgrade to create more")
			return
		}
	}

	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	params := db.CreateTimelineParams{
		UserID:      userID,
		Slug:        service.GenerateSlug(req.Title),
		Title:       req.Title,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:    pgtype.Text{String: req.Category, Valid: req.Category != ""},
		CtaText:     pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:      pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		IsPublic:    isPublic,
	}
	if req.SpaceID != "" {
		uid, err := uuid.Parse(req.SpaceID)
		if err == nil {
			params.SpaceID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	timeline, err := h.queries.CreateTimeline(r.Context(), params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create timeline")
		return
	}

	JSON(w, http.StatusCreated, timelineResponse(timeline))
}

func (h *TimelineHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userIDs, err := middleware.GetAccessibleUserIDs(r.Context(), h.queries, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get accessible users")
		return
	}

	timelines, err := h.queries.ListTimelinesByUserIDs(r.Context(), userIDs)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list timelines")
		return
	}

	result := make([]map[string]any, len(timelines))
	for i, t := range timelines {
		result[i] = timelineResponse(t)
	}
	JSON(w, http.StatusOK, result)
}

func (h *TimelineHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}

	entries, err := h.queries.ListTimelineEntries(r.Context(), timeline.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list entries")
		return
	}

	resp := timelineResponse(timeline)
	entryResults := make([]map[string]any, len(entries))
	for i, e := range entries {
		entryResults[i] = timelineEntryResponse(e)
	}
	resp["entries"] = entryResults
	JSON(w, http.StatusOK, resp)
}

type updateTimelineRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Category    string `json:"category"`
	CtaText     string `json:"cta_text"`
	CtaURL      string `json:"cta_url"`
	IsPublic    bool   `json:"is_public"`
}

func (h *TimelineHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	var req updateTimelineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateTimeline(r.Context(), db.UpdateTimelineParams{
		ID:          pgtype.UUID{Bytes: uid, Valid: true},
		Title:       req.Title,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:    pgtype.Text{String: req.Category, Valid: req.Category != ""},
		CtaText:     pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:      pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		IsPublic:    req.IsPublic,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update timeline")
		return
	}

	JSON(w, http.StatusOK, timelineResponse(updated))
}

func (h *TimelineHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	if err := h.queries.DeleteTimeline(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete timeline")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type createTimelineEntryRequest struct {
	ImageURL  string `json:"image_url"`
	Label     string `json:"label"`
	Date      string `json:"date"`
	Note      string `json:"note"`
	SortOrder int    `json:"sort_order"`
}

func (h *TimelineHandler) CreateEntry(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	timelineID := chi.URLParam(r, "id")
	tuid, err := uuid.Parse(timelineID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: tuid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	// Free plan: max 4 entries per timeline
	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}
	if user.Plan == db.UserPlanFree {
		count, err := h.queries.CountTimelineEntriesByTimelineID(r.Context(), timeline.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to count entries")
			return
		}
		if count >= 4 {
			Error(w, http.StatusForbidden, "entry limit reached — upgrade to add more")
			return
		}
	}

	var req createTimelineEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.ImageURL == "" || req.Label == "" {
		Error(w, http.StatusBadRequest, "image_url and label are required")
		return
	}

	params := db.CreateTimelineEntryParams{
		TimelineID: timeline.ID,
		ImageUrl:   req.ImageURL,
		Label:      req.Label,
		Note:       pgtype.Text{String: req.Note, Valid: req.Note != ""},
		SortOrder:  int32(req.SortOrder),
	}
	if req.Date != "" {
		t, err := time.Parse("2006-01-02", req.Date)
		if err == nil {
			params.Date = pgtype.Date{Time: t, Valid: true}
		}
	}

	entry, err := h.queries.CreateTimelineEntry(r.Context(), params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create entry")
		return
	}

	JSON(w, http.StatusCreated, timelineEntryResponse(entry))
}

func (h *TimelineHandler) UpdateEntry(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	entryID := chi.URLParam(r, "entryId")
	euid, err := uuid.Parse(entryID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid entry id")
		return
	}

	timelineID := chi.URLParam(r, "id")
	tuid, err := uuid.Parse(timelineID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: tuid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	var req createTimelineEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := db.UpdateTimelineEntryParams{
		ID:       pgtype.UUID{Bytes: euid, Valid: true},
		ImageUrl: req.ImageURL,
		Label:    req.Label,
		Note:     pgtype.Text{String: req.Note, Valid: req.Note != ""},
	}
	if req.Date != "" {
		t, err := time.Parse("2006-01-02", req.Date)
		if err == nil {
			params.Date = pgtype.Date{Time: t, Valid: true}
		}
	}

	entry, err := h.queries.UpdateTimelineEntry(r.Context(), params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update entry")
		return
	}

	JSON(w, http.StatusOK, timelineEntryResponse(entry))
}

func (h *TimelineHandler) DeleteEntry(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	timelineID := chi.URLParam(r, "id")
	tuid, err := uuid.Parse(timelineID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: tuid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	entryID := chi.URLParam(r, "entryId")
	euid, err := uuid.Parse(entryID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid entry id")
		return
	}

	if err := h.queries.DeleteTimelineEntry(r.Context(), pgtype.UUID{Bytes: euid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete entry")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type reorderEntry struct {
	ID        string `json:"id"`
	SortOrder int    `json:"sort_order"`
}

func (h *TimelineHandler) ReorderEntries(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	timelineID := chi.URLParam(r, "id")
	tuid, err := uuid.Parse(timelineID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid timeline id")
		return
	}

	timeline, err := h.queries.GetTimelineByID(r.Context(), pgtype.UUID{Bytes: tuid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, timeline.UserID) {
		Error(w, http.StatusForbidden, "not your timeline")
		return
	}

	var entries []reorderEntry
	if err := json.NewDecoder(r.Body).Decode(&entries); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for _, e := range entries {
		euid, err := uuid.Parse(e.ID)
		if err != nil {
			continue
		}
		_ = h.queries.ReorderTimelineEntry(r.Context(), db.ReorderTimelineEntryParams{
			ID:        pgtype.UUID{Bytes: euid, Valid: true},
			SortOrder: int32(e.SortOrder),
		})
	}

	JSON(w, http.StatusOK, map[string]string{"status": "reordered"})
}

// GetPublic returns a public timeline by slug with entries.
func (h *TimelineHandler) GetPublic(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	timeline, err := h.queries.GetPublicTimelineBySlug(r.Context(), slug)
	if err != nil {
		Error(w, http.StatusNotFound, "timeline not found")
		return
	}

	entries, err := h.queries.ListTimelineEntries(r.Context(), timeline.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list entries")
		return
	}

	resp := timelineResponse(timeline)
	entryResults := make([]map[string]any, len(entries))
	for i, e := range entries {
		entryResults[i] = timelineEntryResponse(e)
	}
	resp["entries"] = entryResults
	JSON(w, http.StatusOK, resp)
}

func timelineResponse(t db.Timeline) map[string]any {
	resp := map[string]any{
		"id":          uuidToString(t.ID),
		"user_id":     t.UserID,
		"slug":        t.Slug,
		"title":       t.Title,
		"description": pgtextToPtr(t.Description),
		"category":    pgtextToPtr(t.Category),
		"cta_text":    pgtextToPtr(t.CtaText),
		"cta_url":     pgtextToPtr(t.CtaUrl),
		"is_public":   t.IsPublic,
		"created_at":  t.CreatedAt.Time,
		"updated_at":  t.UpdatedAt.Time,
	}
	if t.SpaceID.Valid {
		resp["space_id"] = uuidToString(t.SpaceID)
	}
	return resp
}

func timelineEntryResponse(e db.TimelineEntry) map[string]any {
	resp := map[string]any{
		"id":         uuidToString(e.ID),
		"timeline_id": uuidToString(e.TimelineID),
		"image_url":  e.ImageUrl,
		"label":      e.Label,
		"note":       pgtextToPtr(e.Note),
		"sort_order": e.SortOrder,
		"created_at": e.CreatedAt.Time,
	}
	if e.Date.Valid {
		resp["date"] = e.Date.Time.Format("2006-01-02")
	}
	return resp
}
