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

type GalleryHandler struct {
	queries *db.Queries
}

func NewGalleryHandler(queries *db.Queries) *GalleryHandler {
	return &GalleryHandler{queries: queries}
}

type createGalleryRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (h *GalleryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())

	var req createGalleryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Title == "" {
		Error(w, http.StatusBadRequest, "title is required")
		return
	}

	slug := service.GenerateSlug(req.Title)

	gallery, err := h.queries.CreateGallery(r.Context(), db.CreateGalleryParams{
		UserID:      userID,
		Title:       req.Title,
		Slug:        slug,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		TenantID:    tenantID,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create gallery")
		return
	}

	JSON(w, http.StatusCreated, galleryResponse(gallery))
}

func (h *GalleryHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	galleries, err := h.queries.ListGalleriesByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list galleries")
		return
	}

	result := make([]map[string]any, len(galleries))
	for i, g := range galleries {
		result[i] = galleryResponse(g)
	}
	JSON(w, http.StatusOK, result)
}

func (h *GalleryHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid gallery id")
		return
	}

	gallery, err := h.queries.GetGalleryByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}

	comps, err := h.queries.GetGalleryComparisons(r.Context(), gallery.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get gallery comparisons")
		return
	}

	resp := galleryResponse(gallery)
	compResults := make([]map[string]any, len(comps))
	for i, c := range comps {
		compResults[i] = comparisonResponse(c)
	}
	resp["comparisons"] = compResults

	JSON(w, http.StatusOK, resp)
}

type updateGalleryRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	IsPublished bool   `json:"is_published"`
}

func (h *GalleryHandler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid gallery id")
		return
	}

	gallery, err := h.queries.GetGalleryByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}
	if gallery.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your gallery")
		return
	}

	var req updateGalleryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateGallery(r.Context(), db.UpdateGalleryParams{
		ID:          pgtype.UUID{Bytes: uid, Valid: true},
		Title:       req.Title,
		Description: pgtype.Text{String: req.Description, Valid: req.Description != ""},
		IsPublished: req.IsPublished,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update gallery")
		return
	}

	JSON(w, http.StatusOK, galleryResponse(updated))
}

func (h *GalleryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid gallery id")
		return
	}

	gallery, err := h.queries.GetGalleryByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}
	if gallery.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your gallery")
		return
	}

	if err := h.queries.DeleteGallery(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete gallery")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type addComparisonRequest struct {
	ComparisonID string `json:"comparison_id"`
	SortOrder    int32  `json:"sort_order"`
}

func (h *GalleryHandler) AddComparison(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	galleryUID, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid gallery id")
		return
	}

	gallery, err := h.queries.GetGalleryByID(r.Context(), pgtype.UUID{Bytes: galleryUID, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}
	if gallery.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your gallery")
		return
	}

	var req addComparisonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	compUID, err := uuid.Parse(req.ComparisonID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	err = h.queries.AddComparisonToGallery(r.Context(), db.AddComparisonToGalleryParams{
		GalleryID:    pgtype.UUID{Bytes: galleryUID, Valid: true},
		ComparisonID: pgtype.UUID{Bytes: compUID, Valid: true},
		SortOrder:    req.SortOrder,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to add comparison to gallery")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "added"})
}

func (h *GalleryHandler) RemoveComparison(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	galleryUID, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid gallery id")
		return
	}

	gallery, err := h.queries.GetGalleryByID(r.Context(), pgtype.UUID{Bytes: galleryUID, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}
	if gallery.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your gallery")
		return
	}

	compID := chi.URLParam(r, "compId")
	compUID, err := uuid.Parse(compID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	err = h.queries.RemoveComparisonFromGallery(r.Context(), db.RemoveComparisonFromGalleryParams{
		GalleryID:    pgtype.UUID{Bytes: galleryUID, Valid: true},
		ComparisonID: pgtype.UUID{Bytes: compUID, Valid: true},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to remove comparison from gallery")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (h *GalleryHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	gallery, err := h.queries.GetGalleryBySlug(r.Context(), slug)
	if err != nil {
		Error(w, http.StatusNotFound, "gallery not found")
		return
	}

	comps, err := h.queries.GetGalleryComparisons(r.Context(), gallery.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get gallery comparisons")
		return
	}

	resp := galleryResponse(gallery)
	compResults := make([]map[string]any, len(comps))
	for i, c := range comps {
		compResults[i] = comparisonResponse(c)
	}
	resp["comparisons"] = compResults

	JSON(w, http.StatusOK, resp)
}

func galleryResponse(g db.Gallery) map[string]any {
	return map[string]any{
		"id":           uuidToString(g.ID),
		"user_id":      g.UserID,
		"title":        g.Title,
		"slug":         g.Slug,
		"description":  pgtextToPtr(g.Description),
		"is_published": g.IsPublished,
		"created_at":   g.CreatedAt.Time,
		"updated_at":   g.UpdatedAt.Time,
	}
}
