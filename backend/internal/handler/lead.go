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

type LeadHandler struct {
	queries     *db.Queries
	emailClient *email.Client
}

func NewLeadHandler(queries *db.Queries, emailClient *email.Client) *LeadHandler {
	return &LeadHandler{queries: queries, emailClient: emailClient}
}

type createLeadRequest struct {
	UserID        string `json:"user_id"`
	ComparisonID  string `json:"comparison_id"`
	SpaceID       string `json:"space_id"`
	Type          string `json:"type"`
	Name          string `json:"name"`
	Phone         string `json:"phone"`
	Email         string `json:"email"`
	Service       string `json:"service"`
	PreferredDate string `json:"preferred_date"`
	PreferredTime string `json:"preferred_time"`
	Message       string `json:"message"`
	SourceURL     string `json:"source_url"`
}

// Create is a public endpoint — visitors submit leads.
func (h *LeadHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createLeadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.UserID == "" || req.Name == "" {
		Error(w, http.StatusBadRequest, "user_id and name are required")
		return
	}

	// Find the tenant for this merchant
	tenant, err := h.queries.GetTenantByOwnerID(r.Context(), req.UserID)
	if err != nil {
		Error(w, http.StatusNotFound, "merchant not found")
		return
	}

	// Get merchant for email notification
	merchant, err := h.queries.GetUserByID(r.Context(), req.UserID)
	if err != nil {
		Error(w, http.StatusNotFound, "merchant not found")
		return
	}

	// Free plan: 10 leads/month
	if tenant.Plan == db.UserPlanFree {
		count, err := h.queries.CountLeadsByTenantIDThisMonth(r.Context(), tenant.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to count leads")
			return
		}
		if count >= 10 {
			Error(w, http.StatusForbidden, "lead limit reached for this merchant")
			return
		}
	}

	leadType := db.LeadTypeContact
	if req.Type == "booking" {
		leadType = db.LeadTypeBooking
	}

	params := db.CreateLeadParams{
		UserID:        req.UserID,
		Type:          leadType,
		Name:          req.Name,
		Phone:         pgtype.Text{String: req.Phone, Valid: req.Phone != ""},
		Email:         pgtype.Text{String: req.Email, Valid: req.Email != ""},
		Service:       pgtype.Text{String: req.Service, Valid: req.Service != ""},
		PreferredDate: pgtype.Text{String: req.PreferredDate, Valid: req.PreferredDate != ""},
		PreferredTime: pgtype.Text{String: req.PreferredTime, Valid: req.PreferredTime != ""},
		Message:       pgtype.Text{String: req.Message, Valid: req.Message != ""},
		SourceUrl:     pgtype.Text{String: req.SourceURL, Valid: req.SourceURL != ""},
		TenantID:      tenant.ID,
	}
	if req.ComparisonID != "" {
		uid, err := uuid.Parse(req.ComparisonID)
		if err == nil {
			params.ComparisonID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}
	if req.SpaceID != "" {
		uid, err := uuid.Parse(req.SpaceID)
		if err == nil {
			params.SpaceID = pgtype.UUID{Bytes: uid, Valid: true}
		}
	}

	lead, err := h.queries.CreateLead(r.Context(), params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create lead")
		return
	}

	// Send email notification to merchant
	h.emailClient.SendNewLeadNotification(
		merchant.Email,
		req.Name,
		string(leadType),
		"https://beforeafter.io/dashboard/leads",
	)

	JSON(w, http.StatusCreated, leadResponse(lead))
}

func (h *LeadHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	leads, err := h.queries.ListLeadsByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list leads")
		return
	}

	statusFilter := r.URL.Query().Get("status")
	result := make([]map[string]any, 0, len(leads))
	for _, l := range leads {
		if statusFilter != "" && string(l.Status) != statusFilter {
			continue
		}
		result = append(result, leadResponse(l))
	}
	JSON(w, http.StatusOK, result)
}

type updateLeadStatusRequest struct {
	Status string `json:"status"`
}

func (h *LeadHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid lead id")
		return
	}

	lead, err := h.queries.GetLeadByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "lead not found")
		return
	}
	if lead.TenantID != tenantID {
		Error(w, http.StatusForbidden, "not your lead")
		return
	}

	var req updateLeadStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.queries.UpdateLeadStatus(r.Context(), db.UpdateLeadStatusParams{
		ID:     pgtype.UUID{Bytes: uid, Valid: true},
		Status: db.LeadStatus(req.Status),
	}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to update lead status")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func (h *LeadHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	stats, err := h.queries.GetLeadStatsByTenantID(r.Context(), tenantID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get lead stats")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"total":        stats.Total,
		"new_count":    stats.NewCount,
		"booked_count": stats.BookedCount,
	})
}

func (h *LeadHandler) GetFormConfig(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.GetTenantID(r.Context())

	config, err := h.queries.GetFormConfigByTenantID(r.Context(), tenantID)
	if err != nil {
		// Return defaults if not found
		JSON(w, http.StatusOK, map[string]any{
			"form_type":          "contact",
			"services":           []string{},
			"whatsapp_number":    nil,
			"auto_reply_message": nil,
		})
		return
	}

	resp := map[string]any{
		"id":                 uuidToString(config.ID),
		"form_type":          string(config.FormType),
		"whatsapp_number":    pgtextToPtr(config.WhatsappNumber),
		"auto_reply_message": pgtextToPtr(config.AutoReplyMessage),
	}
	if config.Services != nil {
		resp["services"] = json.RawMessage(config.Services)
	}
	JSON(w, http.StatusOK, resp)
}

type updateFormConfigRequest struct {
	FormType         string   `json:"form_type"`
	Services         []string `json:"services"`
	WhatsappNumber   string   `json:"whatsapp_number"`
	AutoReplyMessage string   `json:"auto_reply_message"`
}

func (h *LeadHandler) UpdateFormConfig(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tenantID := middleware.GetTenantID(r.Context())

	var req updateFormConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.FormType == "" {
		req.FormType = "contact"
	}
	servicesJSON, _ := json.Marshal(req.Services)

	config, err := h.queries.UpsertFormConfig(r.Context(), db.UpsertFormConfigParams{
		UserID:           userID,
		FormType:         db.FormType(req.FormType),
		Services:         servicesJSON,
		WhatsappNumber:   pgtype.Text{String: req.WhatsappNumber, Valid: req.WhatsappNumber != ""},
		AutoReplyMessage: pgtype.Text{String: req.AutoReplyMessage, Valid: req.AutoReplyMessage != ""},
		TenantID:         tenantID,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to update form config")
		return
	}

	resp := map[string]any{
		"id":                 uuidToString(config.ID),
		"form_type":          string(config.FormType),
		"whatsapp_number":    pgtextToPtr(config.WhatsappNumber),
		"auto_reply_message": pgtextToPtr(config.AutoReplyMessage),
	}
	if config.Services != nil {
		resp["services"] = json.RawMessage(config.Services)
	}
	JSON(w, http.StatusOK, resp)
}

func leadResponse(l db.Lead) map[string]any {
	resp := map[string]any{
		"id":             uuidToString(l.ID),
		"user_id":        l.UserID,
		"type":           string(l.Type),
		"name":           l.Name,
		"phone":          pgtextToPtr(l.Phone),
		"email":          pgtextToPtr(l.Email),
		"service":        pgtextToPtr(l.Service),
		"preferred_date": pgtextToPtr(l.PreferredDate),
		"preferred_time": pgtextToPtr(l.PreferredTime),
		"message":        pgtextToPtr(l.Message),
		"status":         string(l.Status),
		"source_url":     pgtextToPtr(l.SourceUrl),
		"created_at":     l.CreatedAt.Time,
		"updated_at":     l.UpdatedAt.Time,
	}
	if l.ComparisonID.Valid {
		resp["comparison_id"] = uuidToString(l.ComparisonID)
	}
	if l.SpaceID.Valid {
		resp["space_id"] = uuidToString(l.SpaceID)
	}
	return resp
}
