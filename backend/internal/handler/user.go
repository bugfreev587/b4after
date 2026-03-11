package handler

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/service"
)

type UserHandler struct {
	queries *db.Queries
}

func NewUserHandler(queries *db.Queries) *UserHandler {
	return &UserHandler{queries: queries}
}

func (h *UserHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusNotFound, "user not found")
		return
	}

	// Auto-create tenant for users who don't have one
	_, tenantErr := h.queries.GetTenantForUser(r.Context(), userID)
	if tenantErr != nil {
		h.autoCreateTenant(r, userID, user)
	}

	JSON(w, http.StatusOK, userResponse(user))
}

func (h *UserHandler) autoCreateTenant(r *http.Request, userID string, user db.User) {
	name := user.Name
	if name == "" {
		name = user.Email
	}
	if name == "" {
		name = "My Workspace"
	}

	slug := "ws-" + service.GenerateSlug(name)

	tenant, err := h.queries.CreateTenant(r.Context(), db.CreateTenantParams{
		Name:    name + "'s Workspace",
		Slug:    slug,
		Plan:    db.UserPlanFree,
		OwnerID: userID,
	})
	if err != nil {
		log.Printf("[user] failed to auto-create tenant for %s: %v", userID, err)
		return
	}

	_, err = h.queries.CreateTenantMember(r.Context(), db.CreateTenantMemberParams{
		TenantID: tenant.ID,
		UserID:   userID,
		Role:     db.TenantMemberRoleOwner,
		Status:   db.TenantMemberStatusActive,
	})
	if err != nil {
		log.Printf("[user] failed to create tenant member for %s: %v", userID, err)
	}
}

func userResponse(u db.User) map[string]any {
	return map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"name":       u.Name,
		"avatar_url": pgtextToPtr(u.AvatarUrl),
		"created_at": u.CreatedAt.Time,
	}
}

func uuidToString(id pgtype.UUID) string {
	return uuid.UUID(id.Bytes).String()
}

func parseUUID(s string) (pgtype.UUID, error) {
	u, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{}, err
	}
	return pgtype.UUID{Bytes: u, Valid: true}, nil
}

func pgtextToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

// GenerateAPIKey creates or regenerates an API key for the current user (business only).
func GenerateAPIKey(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok {
			Error(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		b := make([]byte, 32)
		if _, err := rand.Read(b); err != nil {
			Error(w, http.StatusInternalServerError, "failed to generate API key")
			return
		}
		apiKey := "ba_" + hex.EncodeToString(b)

		_, err := queries.SetUserAPIKey(r.Context(), db.SetUserAPIKeyParams{
			ID:     userID,
			ApiKey: pgtype.Text{String: apiKey, Valid: true},
		})
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to save API key")
			return
		}

		JSON(w, http.StatusOK, map[string]string{"api_key": apiKey})
	}
}
