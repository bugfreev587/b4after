package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type BrandHandler struct {
	queries *db.Queries
}

func NewBrandHandler(queries *db.Queries) *BrandHandler {
	return &BrandHandler{queries: queries}
}

type createBrandRequest struct {
	Name           string `json:"name"`
	LogoURL        string `json:"logo_url"`
	PrimaryColor   string `json:"primary_color"`
	SecondaryColor string `json:"secondary_color"`
	WebsiteURL     string `json:"website_url"`
}

func (h *BrandHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req createBrandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.PrimaryColor == "" {
		req.PrimaryColor = "#833AB4"
	}
	if req.SecondaryColor == "" {
		req.SecondaryColor = "#E1306C"
	}

	brand, err := h.queries.CreateBrand(r.Context(), db.CreateBrandParams{
		UserID:         userID,
		Name:           req.Name,
		LogoUrl:        pgtype.Text{String: req.LogoURL, Valid: req.LogoURL != ""},
		PrimaryColor:   req.PrimaryColor,
		SecondaryColor: req.SecondaryColor,
		WebsiteUrl:     pgtype.Text{String: req.WebsiteURL, Valid: req.WebsiteURL != ""},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create brand")
		return
	}

	JSON(w, http.StatusCreated, brandResponse(brand))
}

func (h *BrandHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	brands, err := h.queries.ListBrandsByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list brands")
		return
	}

	result := make([]map[string]any, len(brands))
	for i, b := range brands {
		result[i] = brandResponse(b)
	}
	JSON(w, http.StatusOK, result)
}

func (h *BrandHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid brand id")
		return
	}

	brand, err := h.queries.GetBrandByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "brand not found")
		return
	}
	if brand.UserID != userID {
		Error(w, http.StatusForbidden, "not your brand")
		return
	}

	var req createBrandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateBrand(r.Context(), db.UpdateBrandParams{
		ID:             pgtype.UUID{Bytes: uid, Valid: true},
		Name:           req.Name,
		LogoUrl:        pgtype.Text{String: req.LogoURL, Valid: req.LogoURL != ""},
		PrimaryColor:   req.PrimaryColor,
		SecondaryColor: req.SecondaryColor,
		WebsiteUrl:     pgtype.Text{String: req.WebsiteURL, Valid: req.WebsiteURL != ""},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update brand")
		return
	}

	JSON(w, http.StatusOK, brandResponse(updated))
}

func brandResponse(b db.Brand) map[string]any {
	return map[string]any{
		"id":              uuidToString(b.ID),
		"user_id":         b.UserID,
		"name":            b.Name,
		"logo_url":        pgtextToPtr(b.LogoUrl),
		"primary_color":   b.PrimaryColor,
		"secondary_color": b.SecondaryColor,
		"website_url":     pgtextToPtr(b.WebsiteUrl),
		"created_at":      b.CreatedAt.Time,
		"updated_at":      b.UpdatedAt.Time,
	}
}
