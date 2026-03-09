package handler

import (
	"encoding/json"
	"net/http"
	"regexp"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/config"
	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

var subdomainRegex = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

var reservedSubdomains = map[string]bool{
	"www": true, "api": true, "app": true, "admin": true,
	"help": true, "support": true, "blog": true, "mail": true,
	"status": true, "docs": true,
}

type SubdomainHandler struct {
	queries *db.Queries
	cfg     *config.Config
}

func NewSubdomainHandler(queries *db.Queries, cfg *config.Config) *SubdomainHandler {
	return &SubdomainHandler{queries: queries, cfg: cfg}
}

func (h *SubdomainHandler) Get(w http.ResponseWriter, r *http.Request) {
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

	JSON(w, http.StatusOK, map[string]any{
		"subdomain":   pgtextToPtr(user.CustomSubdomain),
		"domain_base": h.cfg.CustomDomainBase,
	})
}

type updateSubdomainRequest struct {
	Subdomain string `json:"subdomain"`
}

func (h *SubdomainHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req updateSubdomainRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Subdomain) < 3 || len(req.Subdomain) > 63 {
		Error(w, http.StatusBadRequest, "subdomain must be 3-63 characters")
		return
	}
	if !subdomainRegex.MatchString(req.Subdomain) {
		Error(w, http.StatusBadRequest, "subdomain must be lowercase alphanumeric with hyphens")
		return
	}
	if reservedSubdomains[req.Subdomain] {
		Error(w, http.StatusBadRequest, "subdomain is reserved")
		return
	}

	user, err := h.queries.UpdateUserSubdomain(r.Context(), db.UpdateUserSubdomainParams{
		ID:              userID,
		CustomSubdomain: pgtype.Text{String: req.Subdomain, Valid: true},
	})
	if err != nil {
		Error(w, http.StatusConflict, "subdomain is already taken")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"subdomain":   pgtextToPtr(user.CustomSubdomain),
		"domain_base": h.cfg.CustomDomainBase,
	})
}

func (h *SubdomainHandler) GetPublicPage(w http.ResponseWriter, r *http.Request) {
	subdomain := chi.URLParam(r, "subdomain")

	user, err := h.queries.GetUserBySubdomain(r.Context(), pgtype.Text{String: subdomain, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "subdomain not found")
		return
	}

	comps, err := h.queries.ListPublishedComparisonsByUserID(r.Context(), user.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list comparisons")
		return
	}

	galleries, err := h.queries.ListPublishedGalleriesByUserID(r.Context(), user.ID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list galleries")
		return
	}

	compResults := make([]map[string]any, len(comps))
	for i, c := range comps {
		compResults[i] = comparisonResponse(c)
	}

	galleryResults := make([]map[string]any, len(galleries))
	for i, g := range galleries {
		galleryResults[i] = galleryResponse(g)
	}

	JSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"name":       user.Name,
			"avatar_url": pgtextToPtr(user.AvatarUrl),
		},
		"comparisons": compResults,
		"galleries":   galleryResults,
	})
}
