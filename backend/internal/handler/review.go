package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type ReviewHandler struct {
	queries *db.Queries
}

func NewReviewHandler(queries *db.Queries) *ReviewHandler {
	return &ReviewHandler{queries: queries}
}

type createReviewRequest struct {
	ReviewerName    string `json:"reviewer_name"`
	ReviewerContact string `json:"reviewer_contact"`
	Rating          int    `json:"rating"`
	Content         string `json:"content"`
	ComparisonID    string `json:"comparison_id"`
	SpaceID         string `json:"space_id"`
}

// Create is a public endpoint — anyone can submit a review for a merchant.
func (h *ReviewHandler) Create(w http.ResponseWriter, r *http.Request) {
	merchantUserID := chi.URLParam(r, "userId")
	if merchantUserID == "" {
		Error(w, http.StatusBadRequest, "user_id is required")
		return
	}

	var req createReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.ReviewerName == "" || req.Content == "" || req.Rating < 1 || req.Rating > 5 {
		Error(w, http.StatusBadRequest, "reviewer_name, content, and rating (1-5) are required")
		return
	}

	// Enforce plan limit: free = 10 total reviews
	user, err := h.queries.GetUserByID(r.Context(), merchantUserID)
	if err != nil {
		Error(w, http.StatusNotFound, "merchant not found")
		return
	}
	if user.Plan == db.UserPlanFree {
		count, err := h.queries.CountReviewsByUserID(r.Context(), merchantUserID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to count reviews")
			return
		}
		if count >= 10 {
			Error(w, http.StatusForbidden, "review limit reached for this merchant")
			return
		}
	}

	params := db.CreateReviewParams{
		UserID:          merchantUserID,
		ReviewerName:    req.ReviewerName,
		ReviewerContact: pgtype.Text{String: req.ReviewerContact, Valid: req.ReviewerContact != ""},
		Rating:          int32(req.Rating),
		Content:         req.Content,
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

	review, err := h.queries.CreateReview(r.Context(), params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create review")
		return
	}

	JSON(w, http.StatusCreated, reviewResponse(review))
}

func (h *ReviewHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userIDs, err := middleware.GetAccessibleUserIDs(r.Context(), h.queries, userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get accessible users")
		return
	}

	reviews, err := h.queries.ListReviewsByUserIDs(r.Context(), userIDs)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list reviews")
		return
	}

	// Optional status filter
	statusFilter := r.URL.Query().Get("status")
	result := make([]map[string]any, 0, len(reviews))
	for _, rev := range reviews {
		if statusFilter != "" && string(rev.Status) != statusFilter {
			continue
		}
		result = append(result, reviewResponse(rev))
	}
	JSON(w, http.StatusOK, result)
}

func (h *ReviewHandler) Publish(w http.ResponseWriter, r *http.Request) {
	h.setStatus(w, r, db.ReviewStatusPublished)
}

func (h *ReviewHandler) Hide(w http.ResponseWriter, r *http.Request) {
	h.setStatus(w, r, db.ReviewStatusHidden)
}

func (h *ReviewHandler) setStatus(w http.ResponseWriter, r *http.Request, status db.ReviewStatus) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid review id")
		return
	}

	review, err := h.queries.GetReviewByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "review not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, review.UserID) {
		Error(w, http.StatusForbidden, "not your review")
		return
	}

	if err := h.queries.UpdateReviewStatus(r.Context(), db.UpdateReviewStatusParams{
		ID:     pgtype.UUID{Bytes: uid, Valid: true},
		Status: status,
	}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to update review status")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": string(status)})
}

type replyReviewRequest struct {
	Reply string `json:"reply"`
}

func (h *ReviewHandler) Reply(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid review id")
		return
	}

	review, err := h.queries.GetReviewByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "review not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, review.UserID) {
		Error(w, http.StatusForbidden, "not your review")
		return
	}

	var req replyReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.queries.UpdateReviewReply(r.Context(), db.UpdateReviewReplyParams{
		ID:    pgtype.UUID{Bytes: uid, Valid: true},
		Reply: pgtype.Text{String: req.Reply, Valid: req.Reply != ""},
	}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to update reply")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "replied"})
}

func (h *ReviewHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid review id")
		return
	}

	review, err := h.queries.GetReviewByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "review not found")
		return
	}
	if !middleware.CanAccessResource(r.Context(), h.queries, userID, review.UserID) {
		Error(w, http.StatusForbidden, "not your review")
		return
	}

	if err := h.queries.DeleteReview(r.Context(), pgtype.UUID{Bytes: uid, Valid: true}); err != nil {
		Error(w, http.StatusInternalServerError, "failed to delete review")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// GetPublicReviews returns published reviews for a merchant (public endpoint).
func (h *ReviewHandler) GetPublicReviews(w http.ResponseWriter, r *http.Request) {
	merchantUserID := chi.URLParam(r, "userId")

	user, err := h.queries.GetUserByID(r.Context(), merchantUserID)
	if err != nil {
		Error(w, http.StatusNotFound, "merchant not found")
		return
	}

	var limit int32 = 5
	if user.Plan != db.UserPlanFree {
		limit = 100
	}

	reviews, err := h.queries.ListPublishedReviewsByUserID(r.Context(), db.ListPublishedReviewsByUserIDParams{
		UserID: merchantUserID,
		Limit:  limit,
	})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to list reviews")
		return
	}

	result := make([]map[string]any, len(reviews))
	for i, rev := range reviews {
		result[i] = reviewResponse(rev)
	}
	JSON(w, http.StatusOK, result)
}

func (h *ReviewHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.queries.GetReviewStats(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get review stats")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"total":           stats.Total,
		"avg_rating":      stats.AvgRating,
		"published_count": stats.PublishedCount,
	})
}

func reviewResponse(r db.Review) map[string]any {
	resp := map[string]any{
		"id":                uuidToString(r.ID),
		"user_id":           r.UserID,
		"reviewer_name":     r.ReviewerName,
		"reviewer_photo_url": pgtextToPtr(r.ReviewerPhotoUrl),
		"reviewer_contact":  pgtextToPtr(r.ReviewerContact),
		"rating":            r.Rating,
		"content":           r.Content,
		"reply":             pgtextToPtr(r.Reply),
		"status":            string(r.Status),
		"created_at":        r.CreatedAt.Time,
		"updated_at":        r.UpdatedAt.Time,
	}
	if r.ComparisonID.Valid {
		resp["comparison_id"] = uuidToString(r.ComparisonID)
	}
	if r.SpaceID.Valid {
		resp["space_id"] = uuidToString(r.SpaceID)
	}
	if r.ReplyAt.Valid {
		resp["reply_at"] = r.ReplyAt.Time
	}
	return resp
}
