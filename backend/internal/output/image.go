package output

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
)

// ImageOptions controls layout, aspect ratio, watermark, and branding for image generation.
type ImageOptions struct {
	Layout        string // "side-by-side" (default) or "stacked"
	AspectRatio   string // "original", "1:1", "4:5", "9:16"
	WatermarkText string // e.g. "BeforeAfter.io" for free users
	BrandLogoURL  string // URL of brand logo overlay for pro/business
}

func downloadImage(url string) (image.Image, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to download image: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 20<<20)) // 20MB limit
	if err != nil {
		return nil, fmt.Errorf("failed to read image: %w", err)
	}

	img, _, err := image.Decode(bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}
	return img, nil
}

var aspectRatios = map[string][2]int{
	"1:1":  {1, 1},
	"4:5":  {4, 5},
	"9:16": {9, 16},
}

func applyAspectRatio(img image.Image, ratio string, targetHeight int) *image.NRGBA {
	if ar, ok := aspectRatios[ratio]; ok {
		w := targetHeight * ar[0] / ar[1]
		return imaging.Fill(img, w, targetHeight, imaging.Center, imaging.Lanczos)
	}
	// "original" — just resize height
	return imaging.Resize(img, 0, targetHeight, imaging.Lanczos)
}

func GenerateComparisonImage(beforeURL, afterURL, beforeLabel, afterLabel string) ([]byte, error) {
	return GenerateComparisonImageWithOptions(beforeURL, afterURL, beforeLabel, afterLabel, ImageOptions{})
}

func GenerateComparisonImageWithOptions(beforeURL, afterURL, beforeLabel, afterLabel string, opts ImageOptions) ([]byte, error) {
	beforeImg, err := downloadImage(beforeURL)
	if err != nil {
		return nil, fmt.Errorf("before image: %w", err)
	}

	afterImg, err := downloadImage(afterURL)
	if err != nil {
		return nil, fmt.Errorf("after image: %w", err)
	}

	targetHeight := 600
	ratio := opts.AspectRatio
	if ratio == "" {
		ratio = "original"
	}

	before := applyAspectRatio(beforeImg, ratio, targetHeight)
	after := applyAspectRatio(afterImg, ratio, targetHeight)

	layout := opts.Layout
	if layout == "" {
		layout = "side-by-side"
	}

	var dc *gg.Context

	labelHeight := 40
	padding := 10
	dividerWidth := 4

	if layout == "stacked" {
		totalWidth := before.Bounds().Dx()
		if after.Bounds().Dx() > totalWidth {
			totalWidth = after.Bounds().Dx()
		}
		totalHeight := labelHeight + before.Bounds().Dy() + dividerWidth + after.Bounds().Dy()

		dc = gg.NewContext(totalWidth, totalHeight)
		dc.SetColor(color.RGBA{26, 20, 37, 255})
		dc.Clear()

		// Labels
		dc.SetColor(color.White)
		fontSize := 18.0
		_ = dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize)

		// Before label top-left, after label top-right
		dc.DrawStringAnchored(beforeLabel, float64(totalWidth/4), float64(labelHeight/2+padding/2), 0.5, 0.5)
		dc.DrawStringAnchored(afterLabel, float64(totalWidth*3/4), float64(labelHeight/2+padding/2), 0.5, 0.5)

		// Before image
		dc.DrawImage(before, (totalWidth-before.Bounds().Dx())/2, labelHeight)

		// Divider
		dc.SetColor(color.White)
		y := float64(labelHeight + before.Bounds().Dy())
		dc.DrawRectangle(0, y, float64(totalWidth), float64(dividerWidth))
		dc.Fill()

		// After image
		dc.DrawImage(after, (totalWidth-after.Bounds().Dx())/2, labelHeight+before.Bounds().Dy()+dividerWidth)
	} else {
		// Side-by-side
		totalWidth := before.Bounds().Dx() + dividerWidth + after.Bounds().Dx()
		totalHeight := targetHeight + labelHeight

		dc = gg.NewContext(totalWidth, totalHeight)
		dc.SetColor(color.RGBA{26, 20, 37, 255})
		dc.Clear()

		dc.DrawImage(before, 0, labelHeight)
		dc.DrawImage(after, before.Bounds().Dx()+dividerWidth, labelHeight)

		// Divider
		dc.SetColor(color.White)
		dc.DrawRectangle(float64(before.Bounds().Dx()), float64(labelHeight), float64(dividerWidth), float64(targetHeight))
		dc.Fill()

		// Labels
		dc.SetColor(color.White)
		fontSize := 18.0
		_ = dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize)
		dc.DrawStringAnchored(beforeLabel, float64(before.Bounds().Dx()/2), float64(labelHeight/2+padding/2), 0.5, 0.5)
		dc.DrawStringAnchored(afterLabel, float64(before.Bounds().Dx()+dividerWidth+after.Bounds().Dx()/2), float64(labelHeight/2+padding/2), 0.5, 0.5)
	}

	// Watermark
	if opts.WatermarkText != "" {
		drawWatermark(dc, opts.WatermarkText)
	}

	// Brand logo overlay
	if opts.BrandLogoURL != "" {
		drawBrandLogo(dc, opts.BrandLogoURL)
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, dc.Image()); err != nil {
		return nil, fmt.Errorf("failed to encode image: %w", err)
	}

	return buf.Bytes(), nil
}

func drawWatermark(dc *gg.Context, text string) {
	w := float64(dc.Width())
	h := float64(dc.Height())
	fontSize := w / 30
	if fontSize < 14 {
		fontSize = 14
	}
	_ = dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize)
	dc.SetRGBA(1, 1, 1, 0.4)
	dc.DrawStringAnchored(text, w-10, h-10, 1.0, 0.0)
}

func drawBrandLogo(dc *gg.Context, logoURL string) {
	logo, err := downloadImage(logoURL)
	if err != nil {
		return // silently skip if logo fails
	}
	// Resize logo to max 80px height
	resized := imaging.Resize(logo, 0, 80, imaging.Lanczos)
	x := dc.Width() - resized.Bounds().Dx() - 10
	y := dc.Height() - resized.Bounds().Dy() - 10
	dc.DrawImage(resized, x, y)
}
