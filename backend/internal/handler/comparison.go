package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/service"
)

// ProcessImage represents a single image in a multi-photo process sequence.
type ProcessImage struct {
	URL   string `json:"url"`
	Label string `json:"label"`
}

type ComparisonHandler struct {
	queries *db.Queries
}

func NewComparisonHandler(queries *db.Queries) *ComparisonHandler {
	return &ComparisonHandler{queries: queries}
}

type createComparisonRequest struct {
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	Category       string          `json:"category"`
	BeforeImageURL string          `json:"before_image_url"`
	AfterImageURL  string          `json:"after_image_url"`
	BeforeLabel    string          `json:"before_label"`
	AfterLabel     string          `json:"after_label"`
	CtaText        string          `json:"cta_text"`
	CtaURL         string          `json:"cta_url"`
	ProcessImages  json.RawMessage `json:"process_images"`
	SpaceID        string          `json:"space_id"`
}

func (h *ComparisonHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	tenantID := middleware.GetTenantID(r.Context())

	var req createComparisonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" || req.BeforeImageURL == "" || req.AfterImageURL == "" {
		Error(w, http.StatusBadRequest, "title and images are required")
		return
	}

	if req.BeforeLabel == "" {
		req.BeforeLabel = "Before"
	}
	if req.AfterLabel == "" {
		req.AfterLabel = "After"
	}
	if req.Category == "" {
		req.Category = "other"
	}

	var spaceUUID pgtype.UUID
	if req.SpaceID != "" {
		spaceUID, err := uuid.Parse(req.SpaceID)
		if err != nil {
			Error(w, http.StatusBadRequest, "invalid space_id")
			return
		}
		spaceUUID = pgtype.UUID{Bytes: spaceUID, Valid: true}

		// Verify space exists and belongs to tenant
		space, err := h.queries.GetSpaceByID(r.Context(), spaceUUID)
		if err != nil {
			Error(w, http.StatusNotFound, "space not found")
			return
		}
		if space.TenantID != tenantID {
			Error(w, http.StatusForbidden, "not your space")
			return
		}

		// Enforce per-space comparison limits: free=1, pro=5, business=10
		plan := middleware.GetTenantPlan(r.Context())
		var maxPerSpace int64 = 1
		switch plan {
		case db.UserPlanPro:
			maxPerSpace = 5
		case db.UserPlanBusiness:
			maxPerSpace = 10
		}
		compCount, err := h.queries.CountComparisonsBySpaceID(r.Context(), spaceUUID)
		if err == nil && compCount >= maxPerSpace {
			Error(w, http.StatusForbidden, "comparison limit per space reached — upgrade to create more")
			return
		}
	}

	slug := service.GenerateSlug(req.Title)

	comp, err := h.queries.CreateComparison(r.Context(), db.CreateComparisonParams{
		UserID:         userID,
		Title:          req.Title,
		Description:    pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Slug:           slug,
		Category:       db.ComparisonCategory(req.Category),
		BeforeImageUrl: req.BeforeImageURL,
		AfterImageUrl:  req.AfterImageURL,
		BeforeLabel:    req.BeforeLabel,
		AfterLabel:     req.AfterLabel,
		CtaText:        pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:         pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		ProcessImages:  req.ProcessImages,
		SpaceID:        spaceUUID,
		Source:         db.ComparisonSourceMerchant,
		TenantID:       tenantID,
		CreatedBy:      pgtype.Text{String: userID, Valid: true},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create comparison")
		return
	}

	JSON(w, http.StatusCreated, comparisonResponse(comp))
}

func (h *ComparisonHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	comps, err := h.queries.ListComparisonsByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list comparisons")
		return
	}

	result := make([]map[string]any, len(comps))
	for i, c := range comps {
		result[i] = comparisonResponse(c)
	}
	JSON(w, http.StatusOK, result)
}

func (h *ComparisonHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}

	JSON(w, http.StatusOK, comparisonResponse(comp))
}

func (h *ComparisonHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	comp, err := h.queries.GetComparisonBySlug(r.Context(), slug)
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}

	// Increment view count
	_ = h.queries.IncrementViewCount(r.Context(), comp.ID)

	JSON(w, http.StatusOK, comparisonResponse(comp))
}

type updateComparisonRequest struct {
	Title          string          `json:"title"`
	Description    string          `json:"description"`
	Category       string          `json:"category"`
	BeforeImageURL string          `json:"before_image_url"`
	AfterImageURL  string          `json:"after_image_url"`
	BeforeLabel    string          `json:"before_label"`
	AfterLabel     string          `json:"after_label"`
	CtaText        string          `json:"cta_text"`
	CtaURL         string          `json:"cta_url"`
	IsPublished    bool            `json:"is_published"`
	ProcessImages  json.RawMessage `json:"process_images"`
}

func (h *ComparisonHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	var req updateComparisonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateComparison(r.Context(), db.UpdateComparisonParams{
		ID:             pgtype.UUID{Bytes: uid, Valid: true},
		Title:          req.Title,
		Description:    pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:       db.ComparisonCategory(req.Category),
		BeforeImageUrl: req.BeforeImageURL,
		AfterImageUrl:  req.AfterImageURL,
		BeforeLabel:    req.BeforeLabel,
		AfterLabel:     req.AfterLabel,
		CtaText:        pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:         pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		IsPublished:    req.IsPublished,
		ProcessImages:  req.ProcessImages,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update comparison")
		return
	}

	JSON(w, http.StatusOK, comparisonResponse(updated))
}

func (h *ComparisonHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	if err := h.queries.DeleteComparison(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete comparison")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func comparisonResponse(c db.Comparison) map[string]any {
	resp := map[string]any{
		"id":               uuidToString(c.ID),
		"user_id":          c.UserID,
		"title":            c.Title,
		"description":      pgtextToPtr(c.Description),
		"slug":             c.Slug,
		"category":         string(c.Category),
		"before_image_url": c.BeforeImageUrl,
		"after_image_url":  c.AfterImageUrl,
		"before_label":     c.BeforeLabel,
		"after_label":      c.AfterLabel,
		"cta_text":         pgtextToPtr(c.CtaText),
		"cta_url":          pgtextToPtr(c.CtaUrl),
		"is_published":     c.IsPublished,
		"view_count":       c.ViewCount,
		"space_id":         uuidToString(c.SpaceID),
		"source":           string(c.Source),
		"created_at":       c.CreatedAt.Time,
		"updated_at":       c.UpdatedAt.Time,
	}
	if c.UploadRequestID.Valid {
		resp["upload_request_id"] = uuidToString(c.UploadRequestID)
	}
	if c.ProcessImages != nil {
		resp["process_images"] = json.RawMessage(c.ProcessImages)
	}
	return resp
}
