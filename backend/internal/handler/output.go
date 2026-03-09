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

	imgBytes, err := output.GenerateComparisonImage(
		comp.BeforeImageUrl, comp.AfterImageUrl,
		comp.BeforeLabel, comp.AfterLabel,
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

func (h *OutputHandler) GenerateVideo(w http.ResponseWriter, r *http.Request) {
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

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}

	videoPath, err := output.GenerateComparisonVideo(comp.BeforeImageUrl, comp.AfterImageUrl, format)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate video")
		return
	}
	defer os.RemoveAll(fmt.Sprintf("%s/..", videoPath)) // Clean up temp dir parent won't work, clean the dir
	defer os.Remove(videoPath)

	// If R2 is configured, upload and return URL
	if h.r2 != nil {
		videoFile, err := os.Open(videoPath)
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to read video")
			return
		}
		defer videoFile.Close()

		key := fmt.Sprintf("users/%s/videos/%s-%s.mp4", userID, comp.Slug, format)
		url, err := h.r2.Upload(r.Context(), key, videoFile, "video/mp4")
		if err != nil {
			Error(w, http.StatusInternalServerError, "failed to upload video")
			return
		}

		// Clean up the entire temp directory
		tmpDir := videoPath[:len(videoPath)-len("/output.mp4")]
		os.RemoveAll(tmpDir)

		JSON(w, http.StatusOK, map[string]string{"url": url})
		return
	}

	// Without R2, return video bytes directly
	videoBytes, err := os.ReadFile(videoPath)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to read video")
		return
	}

	tmpDir := videoPath[:len(videoPath)-len("/output.mp4")]
	os.RemoveAll(tmpDir)

	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-%s.mp4"`, comp.Slug, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}

func (h *OutputHandler) GenerateTransformVideo(w http.ResponseWriter, r *http.Request) {
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

	format := r.URL.Query().Get("format")
	if format == "" {
		format = "square"
	}

	videoPath, err := output.GenerateTransformationVideo(comp.BeforeImageUrl, comp.AfterImageUrl, format)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate transform video")
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

		key := fmt.Sprintf("users/%s/videos/%s-transform-%s.mp4", userID, comp.Slug, format)
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
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-transform-%s.mp4"`, comp.Slug, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}

func (h *OutputHandler) GenerateProcessVideo(w http.ResponseWriter, r *http.Request) {
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

		key := fmt.Sprintf("users/%s/videos/%s-process-%s.mp4", userID, comp.Slug, format)
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
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-process-%s.mp4"`, comp.Slug, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}

func (h *OutputHandler) GenerateMultiPhotoProcessVideo(w http.ResponseWriter, r *http.Request) {
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

		key := fmt.Sprintf("users/%s/videos/%s-multi-process-%s.mp4", userID, comp.Slug, format)
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
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s-multi-process-%s.mp4"`, comp.Slug, format))
	w.WriteHeader(http.StatusOK)
	_, _ = bytes.NewReader(videoBytes).WriteTo(w)
}
