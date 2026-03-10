package handler

import (
	"bytes"
	"fmt"
	"image/jpeg"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
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

	// Auto-compress: decode, resize if > 4000px, re-encode as JPEG 85%
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to read file")
		return
	}

	uploadReader, uploadContentType, ext := compressImage(fileBytes, contentType, filepath.Ext(header.Filename))

	key := fmt.Sprintf("users/%s/uploads/%d%s", userID, time.Now().UnixMilli(), ext)

	url, err := h.r2.Upload(r.Context(), key, uploadReader, uploadContentType)
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

const maxImageDimension = 4000

// compressImage decodes the image, resizes if > 4000px on any side,
// and re-encodes as JPEG 85%. Returns reader, content-type, and extension.
func compressImage(data []byte, contentType, originalExt string) (io.Reader, string, string) {
	img, err := imaging.Decode(bytes.NewReader(data))
	if err != nil {
		// Can't decode — upload original bytes
		return bytes.NewReader(data), contentType, originalExt
	}

	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	// Resize if either dimension exceeds max
	if w > maxImageDimension || h > maxImageDimension {
		if w > h {
			img = imaging.Resize(img, maxImageDimension, 0, imaging.Lanczos)
		} else {
			img = imaging.Resize(img, 0, maxImageDimension, imaging.Lanczos)
		}
	}

	// Re-encode as JPEG 85%
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
		return bytes.NewReader(data), contentType, originalExt
	}

	return &buf, "image/jpeg", ".jpg"
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
