package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
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

			// Fetch user profile from Clerk to get email, name, avatar
			var email, name string
			var avatarURL pgtype.Text
			clerkUsr, err := clerkuser.Get(r.Context(), userID)
			if err != nil {
				log.Printf("failed to fetch Clerk user %s: %v", userID, err)
			} else {
				if clerkUsr.PrimaryEmailAddressID != nil {
					for _, e := range clerkUsr.EmailAddresses {
						if e.ID == *clerkUsr.PrimaryEmailAddressID {
							email = e.EmailAddress
							break
						}
					}
				}
				var first, last string
				if clerkUsr.FirstName != nil {
					first = *clerkUsr.FirstName
				}
				if clerkUsr.LastName != nil {
					last = *clerkUsr.LastName
				}
				name = strings.TrimSpace(first + " " + last)
				if clerkUsr.ImageURL != nil && *clerkUsr.ImageURL != "" {
					avatarURL = pgtype.Text{String: *clerkUsr.ImageURL, Valid: true}
				}
			}

			log.Printf("[auth] upserting user %s email=%q name=%q", userID, email, name)
			_, err = queries.UpsertUser(r.Context(), db.UpsertUserParams{
				ID:        userID,
				Email:     email,
				Name:      name,
				AvatarUrl: avatarURL,
			})
			if err != nil {
				log.Printf("[auth] ERROR: failed to upsert user %s: %v", userID, err)
				writeError(w, http.StatusInternalServerError, "failed to sync user")
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
