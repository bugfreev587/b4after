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

func GenerateComparisonImage(beforeURL, afterURL, beforeLabel, afterLabel string) ([]byte, error) {
	beforeImg, err := downloadImage(beforeURL)
	if err != nil {
		return nil, fmt.Errorf("before image: %w", err)
	}

	afterImg, err := downloadImage(afterURL)
	if err != nil {
		return nil, fmt.Errorf("after image: %w", err)
	}

	// Resize both images to the same height (600px), maintain aspect ratio
	targetHeight := 600
	before := imaging.Resize(beforeImg, 0, targetHeight, imaging.Lanczos)
	after := imaging.Resize(afterImg, 0, targetHeight, imaging.Lanczos)

	labelHeight := 40
	padding := 10
	dividerWidth := 4

	totalWidth := before.Bounds().Dx() + dividerWidth + after.Bounds().Dx()
	totalHeight := targetHeight + labelHeight

	dc := gg.NewContext(totalWidth, totalHeight)

	// Background
	dc.SetColor(color.RGBA{26, 20, 37, 255}) // #1A1425
	dc.Clear()

	// Draw before image
	dc.DrawImage(before, 0, labelHeight)

	// Draw after image
	dc.DrawImage(after, before.Bounds().Dx()+dividerWidth, labelHeight)

	// Draw divider
	dc.SetColor(color.White)
	dc.DrawRectangle(float64(before.Bounds().Dx()), float64(labelHeight), float64(dividerWidth), float64(targetHeight))
	dc.Fill()

	// Draw labels
	dc.SetColor(color.White)
	fontSize := 18.0
	if err := dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize); err != nil {
		// Fallback: try system fonts or skip labels
		dc.SetColor(color.White)
	}
	dc.DrawStringAnchored(beforeLabel, float64(before.Bounds().Dx()/2), float64(labelHeight/2+padding/2), 0.5, 0.5)
	dc.DrawStringAnchored(afterLabel, float64(before.Bounds().Dx()+dividerWidth+after.Bounds().Dx()/2), float64(labelHeight/2+padding/2), 0.5, 0.5)

	var buf bytes.Buffer
	if err := png.Encode(&buf, dc.Image()); err != nil {
		return nil, fmt.Errorf("failed to encode image: %w", err)
	}

	return buf.Bytes(), nil
}
