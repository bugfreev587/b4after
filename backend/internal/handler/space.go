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

type SpaceHandler struct {
	queries *db.Queries
}

func NewSpaceHandler(queries *db.Queries) *SpaceHandler {
	return &SpaceHandler{queries: queries}
}

type createSpaceRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Category      string   `json:"category"`
	CoverImageURL string   `json:"cover_image_url"`
	Services      []string `json:"services"`
	CtaText       string   `json:"cta_text"`
	CtaURL        string   `json:"cta_url"`
	CtaType       string   `json:"cta_type"`
	IsPublic      *bool    `json:"is_public"`
}

func (h *SpaceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())

	var req createSpaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		Error(w, http.StatusBadRequest, "name is required")
		return
	}

	// Enforce plan limits: free=1, pro=1, business=5
	plan := middleware.GetTenantPlan(r.Context())
	count, err := h.queries.CountSpacesByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to count spaces")
		return
	}
	var maxSpaces int64 = 1
	if plan == db.UserPlanBusiness {
		maxSpaces = 5
	}
	if count >= maxSpaces {
		Error(w, http.StatusForbidden, "space limit reached for your plan — upgrade to create more")
		return
	}

	if req.Category == "" {
		req.Category = "other"
	}
	if req.CtaType == "" {
		req.CtaType = "none"
	}
	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	servicesJSON, _ := json.Marshal(req.Services)
	slug := service.GenerateSlug(req.Name)

	space, err := h.queries.CreateSpace(r.Context(), db.CreateSpaceParams{
		UserID:        userID,
		Slug:          slug,
		Name:          req.Name,
		Description:   pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:      db.ComparisonCategory(req.Category),
		CoverImageUrl: pgtype.Text{String: req.CoverImageURL, Valid: req.CoverImageURL != ""},
		Services:      servicesJSON,
		CtaText:       pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:        pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		CtaType:       db.CtaType(req.CtaType),
		IsPublic:      isPublic,
		TenantID:      tenantID,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create space")
		return
	}

	JSON(w, http.StatusCreated, spaceResponse(space))
}

func (h *SpaceHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	spaces, err := h.queries.ListSpacesByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list spaces")
		return
	}

	result := make([]map[string]any, len(spaces))
	for i, s := range spaces {
		result[i] = spaceResponse(s)
	}
	JSON(w, http.StatusOK, result)
}

func (h *SpaceHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid space id")
		return
	}

	space, err := h.queries.GetSpaceByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}

	JSON(w, http.StatusOK, spaceResponse(space))
}

type updateSpaceRequest struct {
	Name          string   `json:"name"`
	Description   string   `json:"description"`
	Category      string   `json:"category"`
	CoverImageURL string   `json:"cover_image_url"`
	Services      []string `json:"services"`
	CtaText       string   `json:"cta_text"`
	CtaURL        string   `json:"cta_url"`
	CtaType       string   `json:"cta_type"`
	IsPublic      bool     `json:"is_public"`
}

func (h *SpaceHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid space id")
		return
	}

	space, err := h.queries.GetSpaceByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}
	if space.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your space")
		return
	}

	var req updateSpaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CtaType == "" {
		req.CtaType = "none"
	}

	servicesJSON, _ := json.Marshal(req.Services)

	updated, err := h.queries.UpdateSpace(r.Context(), db.UpdateSpaceParams{
		ID:            pgtype.UUID{Bytes: uid, Valid: true},
		Name:          req.Name,
		Description:   pgtype.Text{String: req.Description, Valid: req.Description != ""},
		Category:      db.ComparisonCategory(req.Category),
		CoverImageUrl: pgtype.Text{String: req.CoverImageURL, Valid: req.CoverImageURL != ""},
		Services:      servicesJSON,
		CtaText:       pgtype.Text{String: req.CtaText, Valid: req.CtaText != ""},
		CtaUrl:        pgtype.Text{String: req.CtaURL, Valid: req.CtaURL != ""},
		CtaType:       db.CtaType(req.CtaType),
		IsPublic:      req.IsPublic,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update space")
		return
	}

	JSON(w, http.StatusOK, spaceResponse(updated))
}

func (h *SpaceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid space id")
		return
	}

	space, err := h.queries.GetSpaceByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}
	if space.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your space")
		return
	}

	if err := h.queries.DeleteSpace(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete space")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *SpaceHandler) GetPublicWall(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	space, err := h.queries.GetPublicSpaceBySlug(r.Context(), slug)
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}

	comps, err := h.queries.ListPublishedComparisonsBySpaceID(r.Context(), space.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list comparisons")
		return
	}

	compResults := make([]map[string]any, len(comps))
	for i, c := range comps {
		compResults[i] = comparisonResponse(c)
	}

	JSON(w, http.StatusOK, map[string]any{
		"space":       spaceResponse(space),
		"comparisons": compResults,
	})
}

func (h *SpaceHandler) GetEmbedData(w http.ResponseWriter, r *http.Request) {
	// Same as GetPublicWall but could have different response format later
	h.GetPublicWall(w, r)
}

func spaceResponse(s db.Space) map[string]any {
	resp := map[string]any{
		"id":              uuidToString(s.ID),
		"user_id":         s.UserID,
		"slug":            s.Slug,
		"name":            s.Name,
		"description":     pgtextToPtr(s.Description),
		"category":        string(s.Category),
		"cover_image_url": pgtextToPtr(s.CoverImageUrl),
		"cta_text":        pgtextToPtr(s.CtaText),
		"cta_url":         pgtextToPtr(s.CtaUrl),
		"cta_type":        string(s.CtaType),
		"is_public":       s.IsPublic,
		"subdomain":       pgtextToPtr(s.Subdomain),
		"created_at":      s.CreatedAt.Time,
		"updated_at":      s.UpdatedAt.Time,
	}
	if s.Services != nil {
		resp["services"] = json.RawMessage(s.Services)
	}
	return resp
}
