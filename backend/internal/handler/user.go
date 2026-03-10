package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
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

	JSON(w, http.StatusOK, userResponse(user))
}

func userResponse(u db.User) map[string]any {
	return map[string]any{
		"id":         u.ID,
		"email":      u.Email,
		"name":       u.Name,
		"avatar_url": pgtextToPtr(u.AvatarUrl),
		"plan":       string(u.Plan),
		"created_at": u.CreatedAt.Time,
	}
}

func uuidToString(id pgtype.UUID) string {
	return uuid.UUID(id.Bytes).String()
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
