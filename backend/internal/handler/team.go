package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/email"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type TeamHandler struct {
	queries     *db.Queries
	emailClient *email.Client
	frontendURL string
}

func NewTeamHandler(queries *db.Queries, emailClient *email.Client, frontendURL string) *TeamHandler {
	return &TeamHandler{queries: queries, emailClient: emailClient, frontendURL: frontendURL}
}

type inviteMemberRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (h *TeamHandler) InviteMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req inviteMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		Error(w, http.StatusBadRequest, "email is required")
		return
	}
	if req.Role == "" {
		req.Role = "member"
	}

	invitee, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		Error(w, http.StatusNotFound, "user not found with that email")
		return
	}

	if invitee.ID == userID {
		Error(w, http.StatusBadRequest, "cannot invite yourself")
		return
	}

	// Check if already a member
	_, err = h.queries.GetTeamMemberByUserAndOwner(r.Context(), db.GetTeamMemberByUserAndOwnerParams{
		UserID:      invitee.ID,
		TeamOwnerID: userID,
	})
	if err == nil {
		Error(w, http.StatusConflict, "user is already a team member")
		return
	}

	member, err := h.queries.AddTeamMember(r.Context(), db.AddTeamMemberParams{
		UserID:      invitee.ID,
		TeamOwnerID: userID,
		Role:        db.TeamRole(req.Role),
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to add team member")
		return
	}

	// Send invitation email
	if h.emailClient != nil {
		owner, _ := h.queries.GetUserByID(r.Context(), userID)
		ownerName := owner.Name
		if ownerName == "" {
			ownerName = owner.Email
		}
		h.emailClient.SendTeamInvite(invitee.Email, ownerName, h.frontendURL+"/dashboard")
	}

	JSON(w, http.StatusCreated, teamMemberResponse(member, invitee.Email, invitee.Name))
}

func (h *TeamHandler) ListMembers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	members, err := h.queries.ListTeamMembersByOwner(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list team members")
		return
	}

	result := make([]map[string]any, len(members))
	for i, m := range members {
		result[i] = map[string]any{
			"id":            uuidToString(m.ID),
			"user_id":       m.UserID,
			"team_owner_id": m.TeamOwnerID,
			"role":          string(m.Role),
			"created_at":    m.CreatedAt.Time,
			"member_email":  m.MemberEmail,
			"member_name":   m.MemberName,
		}
	}
	JSON(w, http.StatusOK, result)
}

func (h *TeamHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid member id")
		return
	}

	member, err := h.queries.GetTeamMember(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "team member not found")
		return
	}
	if member.TeamOwnerID != userID {
		Error(w, http.StatusForbidden, "not your team")
		return
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateTeamMemberRole(r.Context(), db.UpdateTeamMemberRoleParams{
		ID:   pgtype.UUID{Bytes: uid, Valid: true},
		Role: db.TeamRole(req.Role),
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update team member")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"id":            uuidToString(updated.ID),
		"user_id":       updated.UserID,
		"team_owner_id": updated.TeamOwnerID,
		"role":          string(updated.Role),
		"created_at":    updated.CreatedAt.Time,
	})
}

func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid member id")
		return
	}

	member, err := h.queries.GetTeamMember(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "team member not found")
		return
	}
	if member.TeamOwnerID != userID {
		Error(w, http.StatusForbidden, "not your team")
		return
	}

	if err := h.queries.RemoveTeamMember(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to remove team member")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

func (h *TeamHandler) ListMemberships(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	teams, err := h.queries.ListTeamsByUserID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list memberships")
		return
	}

	result := make([]map[string]any, len(teams))
	for i, t := range teams {
		result[i] = map[string]any{
			"id":            uuidToString(t.ID),
			"user_id":       t.UserID,
			"team_owner_id": t.TeamOwnerID,
			"role":          string(t.Role),
			"created_at":    t.CreatedAt.Time,
			"owner_email":   t.OwnerEmail,
			"owner_name":    t.OwnerName,
		}
	}
	JSON(w, http.StatusOK, result)
}

func teamMemberResponse(m db.TeamMember, email, name string) map[string]any {
	return map[string]any{
		"id":            uuidToString(m.ID),
		"user_id":       m.UserID,
		"team_owner_id": m.TeamOwnerID,
		"role":          string(m.Role),
		"created_at":    m.CreatedAt.Time,
		"member_email":  email,
		"member_name":   name,
	}
}
