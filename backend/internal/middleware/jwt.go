package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

type contextKey string

const userIDKey contextKey = "userID"

func ClerkAuthMiddleware(queries *db.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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

			// Lazy upsert: ensure user exists in DB
			// The JWT typically doesn't include email/name directly,
			// but we still create the user record with the Clerk user ID.
			// User details can be synced via webhooks or the /api/users/me endpoint.
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

func GetUserIDFromContext(ctx context.Context) (string, bool) {
	id, ok := ctx.Value(userIDKey).(string)
	return id, ok
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
