package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/storage"
)

type UploadHandler struct {
	r2 *storage.R2Client
}

func NewUploadHandler(r2 *storage.R2Client) *UploadHandler {
	return &UploadHandler{r2: r2}
}

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

const maxUploadSize = 10 << 20 // 10MB

func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
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

	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = ".jpg"
	}
	key := fmt.Sprintf("users/%s/uploads/%d%s", userID, time.Now().UnixMilli(), ext)

	url, err := h.r2.Upload(r.Context(), key, file, contentType)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to upload file")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"url": url, "key": key})
}

func ImageKeyFromURL(publicURL, imageURL string) string {
	return strings.TrimPrefix(imageURL, publicURL+"/")
}

// Placeholder for when R2 is not configured
type NoopR2Client struct{}

func NewNoopUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

func (h *UploadHandler) UploadLocal(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
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

	_ = userID
	ext := filepath.Ext(header.Filename)
	fakeURL := fmt.Sprintf("/uploads/%s%d%s", uuid.New().String()[:8], time.Now().UnixMilli(), ext)
	JSON(w, http.StatusOK, map[string]string{"url": fakeURL, "key": fakeURL})
}
