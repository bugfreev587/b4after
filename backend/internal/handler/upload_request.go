package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/email"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/service"
	"github.com/xiaoboyu/b4after/backend/internal/storage"
)

type UploadRequestHandler struct {
	queries     *db.Queries
	r2          *storage.R2Client
	emailClient *email.Client
	frontendURL string
}

func NewUploadRequestHandler(queries *db.Queries, r2 *storage.R2Client, emailClient *email.Client, frontendURL string) *UploadRequestHandler {
	return &UploadRequestHandler{
		queries:     queries,
		r2:          r2,
		emailClient: emailClient,
		frontendURL: frontendURL,
	}
}

type createUploadRequestRequest struct {
	ClientName      string `json:"client_name"`
	ClientEmail     string `json:"client_email"`
	ClientPhone     string `json:"client_phone"`
	RequestType     string `json:"request_type"`
	InstructionNote string `json:"instruction_note"`
	ServiceType     string `json:"service_type"`
	SentVia         string `json:"sent_via"`
}

// CreateRequest creates a new upload request for a space (auth required).
func (h *UploadRequestHandler) CreateRequest(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	spaceID := chi.URLParam(r, "id")
	spaceUID, err := uuid.Parse(spaceID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid space id")
		return
	}
	spaceUUID := pgtype.UUID{Bytes: spaceUID, Valid: true}

	// Verify space ownership
	space, err := h.queries.GetSpaceByID(r.Context(), spaceUUID)
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, space.UserID) {
		Error(w, http.StatusForbidden, "not your space")
		return
	}

	// Enforce free plan limit: 3 requests/month
	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}
	if user.Plan == db.UserPlanFree {
		count, err := h.queries.CountUploadRequestsByUserIDThisMonth(r.Context(), userID)
		if err == nil && count >= 3 {
			Error(w, http.StatusForbidden, "free plan is limited to 3 upload requests per month — upgrade for unlimited")
			return
		}
	}

	var req createUploadRequestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RequestType == "" {
		req.RequestType = "both"
	}
	if req.SentVia == "" {
		req.SentVia = "manual_link"
	}

	token := service.GenerateToken(24)

	ur, err := h.queries.CreateUploadRequest(r.Context(), db.CreateUploadRequestParams{
		SpaceID:         spaceUUID,
		UserID:          userID,
		Token:           token,
		ClientName:      pgtype.Text{String: req.ClientName, Valid: req.ClientName != ""},
		ClientEmail:     pgtype.Text{String: req.ClientEmail, Valid: req.ClientEmail != ""},
		ClientPhone:     pgtype.Text{String: req.ClientPhone, Valid: req.ClientPhone != ""},
		RequestType:     db.UploadRequestType(req.RequestType),
		InstructionNote: pgtype.Text{String: req.InstructionNote, Valid: req.InstructionNote != ""},
		ServiceType:     pgtype.Text{String: req.ServiceType, Valid: req.ServiceType != ""},
		SentVia:         db.UploadRequestSentVia(req.SentVia),
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create upload request")
		return
	}

	// Send email if client email provided and sent_via is email
	if req.ClientEmail != "" && req.SentVia == "email" {
		uploadURL := fmt.Sprintf("%s/u/%s", h.frontendURL, token)
		h.emailClient.SendUploadRequest(req.ClientEmail, req.ClientName, user.Name, uploadURL)
	}

	JSON(w, http.StatusCreated, uploadRequestResponse(ur, h.frontendURL))
}

// ListRequests lists upload requests for a space (auth required).
func (h *UploadRequestHandler) ListRequests(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	spaceID := chi.URLParam(r, "id")
	spaceUID, err := uuid.Parse(spaceID)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid space id")
		return
	}

	space, err := h.queries.GetSpaceByID(r.Context(), pgtype.UUID{Bytes: spaceUID, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "space not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, space.UserID) {
		Error(w, http.StatusForbidden, "not your space")
		return
	}

	requests, err := h.queries.ListUploadRequestsBySpaceID(r.Context(), pgtype.UUID{Bytes: spaceUID, Valid: true})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list requests")
		return
	}

	result := make([]map[string]any, len(requests))
	for i, ur := range requests {
		result[i] = uploadRequestResponse(ur, h.frontendURL)
	}
	JSON(w, http.StatusOK, result)
}

// SendReminder sends a reminder email (auth required).
func (h *UploadRequestHandler) SendReminder(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid request id")
		return
	}

	ur, err := h.queries.GetUploadRequestByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, ur.UserID) {
		Error(w, http.StatusForbidden, "not your request")
		return
	}

	if ur.ClientEmail.Valid && ur.ClientEmail.String != "" {
		user, _ := h.queries.GetUserByID(r.Context(), userID)
		uploadURL := fmt.Sprintf("%s/u/%s", h.frontendURL, ur.Token)
		h.emailClient.SendUploadReminder(ur.ClientEmail.String, ur.ClientName.String, user.Name, uploadURL)
	}

	_ = h.queries.UpdateUploadRequestReminderSent(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})

	JSON(w, http.StatusOK, map[string]string{"status": "reminder_sent"})
}

// Approve approves a submitted upload request and creates a comparison (auth required).
func (h *UploadRequestHandler) Approve(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid request id")
		return
	}

	ur, err := h.queries.GetUploadRequestByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, ur.UserID) {
		Error(w, http.StatusForbidden, "not your request")
		return
	}
	if ur.Status != db.UploadRequestStatusSubmitted {
		Error(w, http.StatusBadRequest, "request must be in submitted status to approve")
		return
	}

	// Update status to approved
	updated, err := h.queries.UpdateUploadRequestReviewed(r.Context(), db.UpdateUploadRequestReviewedParams{
		ID:     pgtype.UUID{Bytes: uid, Valid: true},
		Status: db.UploadRequestStatusApproved,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to approve request")
		return
	}

	// Auto-create comparison from the upload request
	title := "Client Upload"
	if ur.ClientName.Valid && ur.ClientName.String != "" {
		title = ur.ClientName.String + " - Before & After"
	}

	beforeURL := ""
	if ur.BeforeImageUrl.Valid {
		beforeURL = ur.BeforeImageUrl.String
	}
	afterURL := ""
	if ur.AfterImageUrl.Valid {
		afterURL = ur.AfterImageUrl.String
	}

	slug := service.GenerateSlug(title)
	requestUUID := pgtype.UUID{Bytes: uid, Valid: true}

	comp, err := h.queries.CreateComparison(r.Context(), db.CreateComparisonParams{
		UserID:          ur.UserID,
		Title:           title,
		Slug:            slug,
		Category:        db.ComparisonCategoryOther,
		BeforeImageUrl:  beforeURL,
		AfterImageUrl:   afterURL,
		BeforeLabel:     "Before",
		AfterLabel:      "After",
		SpaceID:         ur.SpaceID,
		Source:          db.ComparisonSourceClient,
		UploadRequestID: requestUUID,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create comparison from request")
		return
	}

	// Send thank you email
	if ur.ClientEmail.Valid && ur.ClientEmail.String != "" {
		h.emailClient.SendUploadThankYou(ur.ClientEmail.String, ur.ClientName.String)
	}

	JSON(w, http.StatusOK, map[string]any{
		"request":    uploadRequestResponse(updated, h.frontendURL),
		"comparison": comparisonResponse(comp),
	})
}

// Reject rejects a submitted upload request (auth required).
func (h *UploadRequestHandler) Reject(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid request id")
		return
	}

	ur, err := h.queries.GetUploadRequestByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, ur.UserID) {
		Error(w, http.StatusForbidden, "not your request")
		return
	}

	updated, err := h.queries.UpdateUploadRequestReviewed(r.Context(), db.UpdateUploadRequestReviewedParams{
		ID:     pgtype.UUID{Bytes: uid, Valid: true},
		Status: db.UploadRequestStatusRejected,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to reject request")
		return
	}

	JSON(w, http.StatusOK, uploadRequestResponse(updated, h.frontendURL))
}

// --- Public endpoints (no auth) ---

// GetRequestByToken fetches an upload request by its public token.
func (h *UploadRequestHandler) GetRequestByToken(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	ur, err := h.queries.GetUploadRequestByToken(r.Context(), token)
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}

	// Check expiry
	if ur.ExpiresAt.Valid && time.Now().After(ur.ExpiresAt.Time) {
		Error(w, http.StatusGone, "this upload request has expired")
		return
	}

	// Check status - only allow if sent or opened
	if ur.Status != db.UploadRequestStatusSent && ur.Status != db.UploadRequestStatusOpened {
		Error(w, http.StatusGone, "this upload request has already been submitted")
		return
	}

	// Mark as opened
	if ur.Status == db.UploadRequestStatusSent {
		_, _ = h.queries.UpdateUploadRequestStatus(r.Context(), db.UpdateUploadRequestStatusParams{
			ID:     ur.ID,
			Status: db.UploadRequestStatusOpened,
		})
	}

	// Return limited info for public view
	JSON(w, http.StatusOK, map[string]any{
		"id":               uuidToString(ur.ID),
		"request_type":     string(ur.RequestType),
		"instruction_note": pgtextToPtr(ur.InstructionNote),
		"client_name":      pgtextToPtr(ur.ClientName),
		"service_type":     pgtextToPtr(ur.ServiceType),
		"expires_at":       ur.ExpiresAt.Time,
	})
}

// UploadPhoto handles photo upload from client (public, no auth).
func (h *UploadRequestHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	ur, err := h.queries.GetUploadRequestByToken(r.Context(), token)
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}
	if ur.ExpiresAt.Valid && time.Now().After(ur.ExpiresAt.Time) {
		Error(w, http.StatusGone, "this upload request has expired")
		return
	}

	if h.r2 == nil {
		Error(w, http.StatusServiceUnavailable, "file upload not configured")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		Error(w, http.StatusBadRequest, "file too large (max 10MB)")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		Error(w, http.StatusBadRequest, "missing file")
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !allowedImageTypes[contentType] {
		Error(w, http.StatusBadRequest, "invalid image type")
		return
	}

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	uploadReader, uploadContentType, ext := compressImage(fileBytes, contentType, filepath.Ext(header.Filename))

	// Read compressed bytes for upload
	compressedBytes, err := io.ReadAll(uploadReader)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to process image")
		return
	}

	key := fmt.Sprintf("requests/%s/%d%s", token, time.Now().UnixMilli(), ext)

	url, err := h.r2.Upload(r.Context(), key, bytes.NewReader(compressedBytes), uploadContentType)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to upload file")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"url": url})
}

// SubmitRequest submits the client's upload request with photos and review (public, no auth).
func (h *UploadRequestHandler) SubmitRequest(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	ur, err := h.queries.GetUploadRequestByToken(r.Context(), token)
	if err != nil {
		Error(w, http.StatusNotFound, "request not found")
		return
	}
	if ur.ExpiresAt.Valid && time.Now().After(ur.ExpiresAt.Time) {
		Error(w, http.StatusGone, "this upload request has expired")
		return
	}
	if ur.Status == db.UploadRequestStatusSubmitted || ur.Status == db.UploadRequestStatusApproved || ur.Status == db.UploadRequestStatusRejected {
		Error(w, http.StatusBadRequest, "this request has already been submitted")
		return
	}

	var req struct {
		BeforeImageURL string `json:"before_image_url"`
		AfterImageURL  string `json:"after_image_url"`
		ReviewRating   int32  `json:"review_rating"`
		ReviewContent  string `json:"review_content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.queries.UpdateUploadRequestSubmission(r.Context(), db.UpdateUploadRequestSubmissionParams{
		ID:             ur.ID,
		BeforeImageUrl: pgtype.Text{String: req.BeforeImageURL, Valid: req.BeforeImageURL != ""},
		AfterImageUrl:  pgtype.Text{String: req.AfterImageURL, Valid: req.AfterImageURL != ""},
		ReviewRating:   pgtype.Int4{Int32: req.ReviewRating, Valid: req.ReviewRating > 0},
		ReviewContent:  pgtype.Text{String: req.ReviewContent, Valid: req.ReviewContent != ""},
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to submit request")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"status":  "submitted",
		"message": "Thank you! Your photos have been submitted for review.",
		"id":      uuidToString(updated.ID),
	})
}

func uploadRequestResponse(ur db.UploadRequest, frontendURL string) map[string]any {
	resp := map[string]any{
		"id":               uuidToString(ur.ID),
		"space_id":         uuidToString(ur.SpaceID),
		"token":            ur.Token,
		"upload_url":       fmt.Sprintf("%s/u/%s", frontendURL, ur.Token),
		"client_name":      pgtextToPtr(ur.ClientName),
		"client_email":     pgtextToPtr(ur.ClientEmail),
		"client_phone":     pgtextToPtr(ur.ClientPhone),
		"request_type":     string(ur.RequestType),
		"instruction_note": pgtextToPtr(ur.InstructionNote),
		"before_image_url": pgtextToPtr(ur.BeforeImageUrl),
		"after_image_url":  pgtextToPtr(ur.AfterImageUrl),
		"review_rating":    nil,
		"review_content":   pgtextToPtr(ur.ReviewContent),
		"service_type":     pgtextToPtr(ur.ServiceType),
		"status":           string(ur.Status),
		"sent_via":         string(ur.SentVia),
		"expires_at":       ur.ExpiresAt.Time,
		"created_at":       ur.CreatedAt.Time,
		"updated_at":       ur.UpdatedAt.Time,
	}
	if ur.ReviewRating.Valid {
		resp["review_rating"] = ur.ReviewRating.Int32
	}
	if ur.ReminderSentAt.Valid {
		resp["reminder_sent_at"] = ur.ReminderSentAt.Time
	}
	if ur.SubmittedAt.Valid {
		resp["submitted_at"] = ur.SubmittedAt.Time
	}
	if ur.ReviewedAt.Valid {
		resp["reviewed_at"] = ur.ReviewedAt.Time
	}
	return resp
}
