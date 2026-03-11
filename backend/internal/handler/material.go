package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/http"

	"github.com/fogleman/gg"
	"github.com/google/uuid"
	qrcode "github.com/skip2/go-qrcode"

	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/storage"
)

type MaterialHandler struct {
	queries *db.Queries
	r2      *storage.R2Client
}

func NewMaterialHandler(queries *db.Queries, r2 *storage.R2Client) *MaterialHandler {
	return &MaterialHandler{queries: queries, r2: r2}
}

type generateMaterialRequest struct {
	URL         string `json:"url"`
	Template    string `json:"template"`
	BrandColors struct {
		Primary   string `json:"primary"`
		Secondary string `json:"secondary"`
	} `json:"brand_colors"`
	LogoURL string `json:"logo_url"`
}

type templateSpec struct {
	Width  int
	Height int
}

var templates = map[string]templateSpec{
	"business_card": {1080, 1920},
	"store_card":    {2480, 3508},
	"instagram":     {1080, 1080},
	"social":        {1200, 630},
}

func (h *MaterialHandler) Generate(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req generateMaterialRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.URL == "" {
		Error(w, http.StatusBadRequest, "url is required")
		return
	}
	if req.Template == "" {
		req.Template = "business_card"
	}

	spec, ok2 := templates[req.Template]
	if !ok2 {
		Error(w, http.StatusBadRequest, "invalid template — use business_card, store_card, instagram, or social")
		return
	}

	// Plan checks
	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}
	if user.Plan == db.UserPlanFree && req.Template != "business_card" {
		Error(w, http.StatusForbidden, "upgrade to unlock all templates")
		return
	}

	// Generate QR code
	qr, err := qrcode.New(req.URL, qrcode.Medium)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate QR code")
		return
	}
	qrSize := spec.Width / 3
	if qrSize < 200 {
		qrSize = 200
	}
	qrImg := qr.Image(qrSize)

	// Create canvas
	dc := gg.NewContext(spec.Width, spec.Height)

	// Background
	bgColor := parseHexColor(req.BrandColors.Primary, color.RGBA{26, 20, 37, 255})
	dc.SetColor(bgColor)
	dc.Clear()

	// Title text
	textColor := parseHexColor(req.BrandColors.Secondary, color.White)
	dc.SetColor(textColor)
	fontSize := float64(spec.Width) / 15
	if err := dc.LoadFontFace("/System/Library/Fonts/Helvetica.ttc", fontSize); err != nil {
		dc.SetColor(textColor)
	}
	dc.DrawStringAnchored("Scan to see the result", float64(spec.Width)/2, float64(spec.Height)*0.15, 0.5, 0.5)

	// Draw QR code centered
	qrX := (spec.Width - qrSize) / 2
	qrY := (spec.Height - qrSize) / 2
	dc.DrawImage(qrImg, qrX, qrY)

	// Watermark for free plan
	if user.Plan == db.UserPlanFree {
		dc.SetColor(color.RGBA{255, 255, 255, 128})
		wmFontSize := float64(spec.Width) / 30
		if err := dc.LoadFontFace("/System/Library/Fonts/Helvetica.ttc", wmFontSize); err == nil {
			dc.DrawStringAnchored("BeforeAfter.io", float64(spec.Width)/2, float64(spec.Height)*0.92, 0.5, 0.5)
		}
	}

	// Encode to PNG
	var buf bytes.Buffer
	img := dc.Image()
	if err := png.Encode(&buf, img); err != nil {
		Error(w, http.StatusInternalServerError, "failed to encode image")
		return
	}

	// Upload to R2
	if h.r2 == nil {
		// Return image directly if no R2
		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=material-%s.png", req.Template))
		w.WriteHeader(http.StatusOK)
		w.Write(buf.Bytes())
		return
	}

	key := fmt.Sprintf("materials/%s/%s-%s.png", userID, req.Template, uuid.New().String()[:8])
	url, err := h.r2.Upload(r.Context(), key, &buf, "image/png")
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to upload material")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"url":      url,
		"template": req.Template,
		"width":    spec.Width,
		"height":   spec.Height,
	})
}

func parseHexColor(hex string, fallback color.Color) color.Color {
	if len(hex) == 0 {
		return fallback
	}
	if hex[0] == '#' {
		hex = hex[1:]
	}
	if len(hex) != 6 {
		return fallback
	}
	var r, g, b uint8
	_, err := fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	if err != nil {
		return fallback
	}
	return color.RGBA{r, g, b, 255}
}

// Ensure image types are used (for compilation)
var _ image.Image
var _ draw.Image
