package middleware

import (
	"context"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

type tenantContextKey string

const (
	tenantIDKey   tenantContextKey = "tenantID"
	tenantRoleKey tenantContextKey = "tenantRole"
	tenantPlanKey tenantContextKey = "tenantPlan"
)

// TenantMiddleware resolves the user's active tenant and injects tenant info into context.
func TenantMiddleware(queries *db.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := GetUserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			tenant, err := queries.GetTenantForUser(r.Context(), userID)
			if err != nil {
				log.Printf("[tenant] no tenant found for user %s: %v", userID, err)
				writeError(w, http.StatusForbidden, "no workspace found")
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, tenantIDKey, tenant.ID)
			ctx = context.WithValue(ctx, tenantRoleKey, tenant.Role)
			ctx = context.WithValue(ctx, tenantPlanKey, tenant.Plan)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireOwner ensures the current user is the tenant owner.
func RequireOwner() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetTenantRole(r.Context())
			if role != db.TenantMemberRoleOwner {
				writeError(w, http.StatusForbidden, "owner access required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// GetTenantID returns the tenant UUID from context.
func GetTenantID(ctx context.Context) pgtype.UUID {
	id, ok := ctx.Value(tenantIDKey).(pgtype.UUID)
	if !ok {
		return pgtype.UUID{}
	}
	return id
}

// GetTenantIDString returns the tenant ID as a string.
func GetTenantIDString(ctx context.Context) string {
	id := GetTenantID(ctx)
	if !id.Valid {
		return ""
	}
	return uuid.UUID(id.Bytes).String()
}

// GetTenantRole returns the user's role in the tenant.
func GetTenantRole(ctx context.Context) db.TenantMemberRole {
	role, ok := ctx.Value(tenantRoleKey).(db.TenantMemberRole)
	if !ok {
		return ""
	}
	return role
}

// GetTenantPlan returns the tenant's plan.
func GetTenantPlan(ctx context.Context) db.UserPlan {
	plan, ok := ctx.Value(tenantPlanKey).(db.UserPlan)
	if !ok {
		return db.UserPlanFree
	}
	return plan
}
