package middleware

import (
	"net/http"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

func RequirePlan(queries *db.Queries, plans ...db.UserPlan) func(http.Handler) http.Handler {
	allowed := make(map[db.UserPlan]bool, len(plans))
	for _, p := range plans {
		allowed[p] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := GetUserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			user, err := queries.GetUserByID(r.Context(), userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to get user")
				return
			}

			if !allowed[user.Plan] {
				writeError(w, http.StatusForbidden, "upgrade your plan to access this feature")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
