package middleware

import (
	"net/http"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

// RequirePlan checks the tenant's plan from context (set by TenantMiddleware).
func RequirePlan(plans ...db.UserPlan) func(http.Handler) http.Handler {
	allowed := make(map[db.UserPlan]bool, len(plans))
	for _, p := range plans {
		allowed[p] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			plan := GetTenantPlan(r.Context())
			if !allowed[plan] {
				writeError(w, http.StatusForbidden, "upgrade your plan to access this feature")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
