package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

// CombinedAuthMiddleware tries API key auth first (X-API-Key header),
// then falls back to Clerk JWT (Authorization: Bearer ...).
func CombinedAuthMiddleware(queries *db.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Try API key first
			apiKey := r.Header.Get("X-API-Key")
			if apiKey != "" {
				user, err := queries.GetUserByAPIKey(r.Context(), pgtype.Text{String: apiKey, Valid: true})
				if err != nil {
					writeError(w, http.StatusUnauthorized, "invalid API key")
					return
				}
				ctx := context.WithValue(r.Context(), userIDKey, user.ID)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Fall back to Clerk JWT
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				writeError(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}

			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token: parts[1],
			})
			if err != nil {
				writeError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			userID := claims.Subject
			if userID == "" {
				writeError(w, http.StatusUnauthorized, "invalid token: missing subject")
				return
			}

			_, err = queries.UpsertUser(r.Context(), db.UpsertUserParams{
				ID:        userID,
				Email:     "",
				Name:      "",
				AvatarUrl: pgtype.Text{},
			})
			if err != nil {
				log.Printf("failed to upsert user %s: %v", userID, err)
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
