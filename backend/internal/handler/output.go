package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/output"
	"github.com/xiaoboyu/b4after/backend/internal/storage"
)

type OutputHandler struct {
	queries *db.Queries
	r2      *storage.R2Client
}

func NewOutputHandler(queries *db.Queries, r2 *storage.R2Client) *OutputHandler {
	return &OutputHandler{queries: queries, r2: r2}
}

// getOutputBranding returns watermark text and brand logo URL based on user plan.
func (h *OutputHandler) getOutputBranding(r *http.Request, userID string) (watermarkText, brandLogoURL string) {
	plan := middleware.GetTenantPlan(r.Context())
	tenantID := middleware.GetTenantID(r.Context())

	switch plan {
	case db.UserPlanFree:
		return "BeforeAfter.io", ""
	case db.UserPlanPro, db.UserPlanBusiness:
		// Check for brand logo
		brands, err := h.queries.ListBrandsByTenantID(r.Context(), tenantID)
		if err == nil && len(brands) > 0 && brands[0].LogoUrl.Valid {
			return "", brands[0].LogoUrl.String
		}
		return "", ""
	}
	return "BeforeAfter.io", ""
}

func (h *OutputHandler) GenerateImage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	watermark, brandLogo := h.getOutputBranding(r, userID)

	layout := r.URL.Query().Get("layout")
	aspectRatio := r.URL.Query().Get("aspect_ratio")

	imgBytes, err := output.GenerateComparisonImageWithOptions(
		comp.BeforeImageUrl, comp.AfterImageUrl,
		comp.BeforeLabel, comp.AfterLabel,
		output.ImageOptions{
			Layout:        layout,
			AspectRatio:   aspectRatio,
			WatermarkText: watermark,
			BrandLogoURL:  brandLogo,
		},
	)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate image")
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-comparison.png"`, comp.Slug))
	w.WriteHeader(http.StatusOK)
	w.Write(imgBytes)
}

func (h *OutputHandler) generateVideoCommon(w http.ResponseWriter, r *http.Request, genFunc func(watermark string) (string, error), suffix string) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}

	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	watermark, _ := h.getOutputBranding(r, userID)

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}

	videoPath, err := genFunc(watermark)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate video")
		return
	}
	defer func() {
		tmpDir := videoPath[:len(videoPath)-len("/output.mp4")]
		os.RemoveAll(tmpDir)
	}()

	if h.r2 != nil {
		videoFile, err := os.Open(videoPath)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to read video")
			return
		}
		defer videoFile.Close()

		key := fmt.Sprintf("users/%s/videos/%s-%s-%s.mp4", userID, comp.Slug, suffix, format)
		url, err := h.r2.Upload(r.Context(), key, videoFile, "video/mp4")
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to upload video")
			return
		}

		JSON(w, http.StatusOK, map[string]string{"url": url})
		return
	}

	videoBytes, err := os.ReadFile(videoPath)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to read video")
		return
	}

	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s-%s.mp4"`, comp.Slug, suffix, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}

func (h *OutputHandler) GenerateVideo(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserIDFromContext(r.Context())
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}
	watermark, _ := h.getOutputBranding(r, userID)

	videoPath, err := output.GenerateComparisonVideoWithOptions(comp.BeforeImageUrl, comp.AfterImageUrl, format, output.VideoOptions{WatermarkText: watermark})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate video")
		return
	}
	h.serveVideo(w, r, videoPath, userID, comp.Slug, "comparison", format)
}

func (h *OutputHandler) GenerateTransformVideo(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserIDFromContext(r.Context())
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}
	watermark, _ := h.getOutputBranding(r, userID)

	videoPath, err := output.GenerateTransformationVideoWithOptions(comp.BeforeImageUrl, comp.AfterImageUrl, format, output.VideoOptions{WatermarkText: watermark})
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate transform video")
		return
	}
	h.serveVideo(w, r, videoPath, userID, comp.Slug, "transform", format)
}

func (h *OutputHandler) GenerateProcessVideo(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserIDFromContext(r.Context())
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}

	videoPath, err := output.GenerateProcessVideo(
		comp.BeforeImageUrl, comp.AfterImageUrl,
		comp.BeforeLabel, comp.AfterLabel, format,
	)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate process video")
		return
	}
	h.serveVideo(w, r, videoPath, userID, comp.Slug, "process", format)
}

func (h *OutputHandler) GenerateMultiPhotoProcessVideo(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserIDFromContext(r.Context())
	id := chi.URLParam(r, "id")
	uid, err := uuid.Parse(id)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid comparison id")
		return
	}
	comp, err := h.queries.GetComparisonByID(r.Context(), pgtype.UUID{Bytes: uid, Valid: true})
	if err != nil {
		Error(w, http.StatusNotFound, "comparison not found")
		return
	}
	if comp.UserID != userID {
		Error(w, http.StatusForbidden, "not your comparison")
		return
	}

	if len(comp.ProcessImages) == 0 {
		Error(w, http.StatusBadRequest, "no process images on this comparison")
		return
	}

	var images []output.ProcessImage
	if err := json.Unmarshal(comp.ProcessImages, &images); err != nil {
		Error(w, http.StatusBadRequest, "invalid process_images data")
		return
	}
	if len(images) < 3 || len(images) > 10 {
		Error(w, http.StatusBadRequest, "need 3-10 process images")
		return
	}

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}

	videoPath, err := output.GenerateMultiPhotoProcessVideo(images, format)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate multi-photo process video")
		return
	}
	h.serveVideo(w, r, videoPath, userID, comp.Slug, "multi-process", format)
}

func (h *OutputHandler) serveVideo(w http.ResponseWriter, r *http.Request, videoPath, userID, slug, suffix, format string) {
	defer func() {
		tmpDir := videoPath[:len(videoPath)-len("/output.mp4")]
		os.RemoveAll(tmpDir)
	}()

	if h.r2 != nil {
		videoFile, err := os.Open(videoPath)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to read video")
			return
		}
		defer videoFile.Close()

		key := fmt.Sprintf("users/%s/videos/%s-%s-%s.mp4", userID, slug, suffix, format)
		url, err := h.r2.Upload(r.Context(), key, videoFile, "video/mp4")
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to upload video")
			return
		}

		JSON(w, http.StatusOK, map[string]string{"url": url})
		return
	}

	videoBytes, err := os.ReadFile(videoPath)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to read video")
		return
	}

	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s-%s.mp4"`, slug, suffix, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}
