package output

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/fogleman/gg"
)

// ProcessImage represents a single image in a multi-photo process sequence.
type ProcessImage struct {
	URL   string `json:"url"`
	Label string `json:"label"`
}

type VideoFormat struct {
	Width  int
	Height int
}

var videoFormats = map[string]VideoFormat{
	"square":    {1080, 1080},
	"portrait":  {1080, 1920},
	"landscape": {1920, 1080},
}

func GenerateComparisonVideo(beforeURL, afterURL, format string) (string, error) {
	vf, ok := videoFormats[format]
	if !ok {
		vf = videoFormats["square"]
	}

	tmpDir, err := os.MkdirTemp("", "b4after-video-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	// Download images
	beforeImg, err := downloadImage(beforeURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("before image: %w", err)
	}
	afterImg, err := downloadImage(afterURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("after image: %w", err)
	}

	// Resize images to video format
	before := imaging.Fill(beforeImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)
	after := imaging.Fill(afterImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)

	beforePath := filepath.Join(tmpDir, "before.png")
	afterPath := filepath.Join(tmpDir, "after.png")
	outputPath := filepath.Join(tmpDir, "output.mp4")

	if err := imaging.Save(before, beforePath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save before image: %w", err)
	}
	if err := imaging.Save(after, afterPath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save after image: %w", err)
	}

	// FFmpeg: create wipe transition video
	// Before 1.5s -> wipe left-to-right 2s -> After 1.5s = 5s total
	filterComplex := fmt.Sprintf(
		"[0:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[before];"+
			"[1:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[after];"+
			"[before][after]xfade=transition=wipeleft:duration=2:offset=1.5",
		vf.Width, vf.Height, vf.Width, vf.Height,
		vf.Width, vf.Height, vf.Width, vf.Height,
	)

	cmd := exec.Command("ffmpeg",
		"-loop", "1", "-t", "3.5", "-i", beforePath,
		"-loop", "1", "-t", "3.5", "-i", afterPath,
		"-filter_complex", filterComplex,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-t", "5",
		"-y",
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("ffmpeg failed: %w\noutput: %s", err, string(output))
	}

	return outputPath, nil
}

func GenerateTransformationVideo(beforeURL, afterURL, format string) (string, error) {
	vf, ok := videoFormats[format]
	if !ok {
		vf = videoFormats["square"]
	}

	tmpDir, err := os.MkdirTemp("", "b4after-transform-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	beforeImg, err := downloadImage(beforeURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("before image: %w", err)
	}
	afterImg, err := downloadImage(afterURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("after image: %w", err)
	}

	before := imaging.Fill(beforeImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)
	after := imaging.Fill(afterImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)

	beforePath := filepath.Join(tmpDir, "before.png")
	afterPath := filepath.Join(tmpDir, "after.png")
	outputPath := filepath.Join(tmpDir, "output.mp4")

	if err := imaging.Save(before, beforePath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save before image: %w", err)
	}
	if err := imaging.Save(after, afterPath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save after image: %w", err)
	}

	// Crossfade: before 1s -> fade 3s -> after 1s = 5s total
	filterComplex := fmt.Sprintf(
		"[0:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[before];"+
			"[1:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[after];"+
			"[before][after]xfade=transition=fade:duration=3:offset=1",
		vf.Width, vf.Height, vf.Width, vf.Height,
		vf.Width, vf.Height, vf.Width, vf.Height,
	)

	cmd := exec.Command("ffmpeg",
		"-loop", "1", "-t", "4", "-i", beforePath,
		"-loop", "1", "-t", "4", "-i", afterPath,
		"-filter_complex", filterComplex,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-t", "5",
		"-y",
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("ffmpeg failed: %w\noutput: %s", err, string(output))
	}

	return outputPath, nil
}

func GenerateProcessVideo(beforeURL, afterURL, beforeLabel, afterLabel, format string) (string, error) {
	vf, ok := videoFormats[format]
	if !ok {
		vf = videoFormats["square"]
	}

	tmpDir, err := os.MkdirTemp("", "b4after-process-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	beforeImg, err := downloadImage(beforeURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("before image: %w", err)
	}
	afterImg, err := downloadImage(afterURL)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("after image: %w", err)
	}

	before := imaging.Fill(beforeImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)
	after := imaging.Fill(afterImg, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)

	beforePath := filepath.Join(tmpDir, "before.png")
	afterPath := filepath.Join(tmpDir, "after.png")
	titlePath := filepath.Join(tmpDir, "title.png")
	outputPath := filepath.Join(tmpDir, "output.mp4")

	if err := imaging.Save(before, beforePath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save before image: %w", err)
	}
	if err := imaging.Save(after, afterPath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save after image: %w", err)
	}

	// Generate title frame using gg
	dc := gg.NewContext(vf.Width, vf.Height)
	dc.SetRGB(0.1, 0.08, 0.14) // Dark background
	dc.Clear()
	dc.SetRGB(1, 1, 1)
	fontSize := float64(vf.Width) / 15
	if err := dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize); err != nil {
		// Fallback: still draw but font may not render
		dc.SetRGB(1, 1, 1)
	}
	dc.DrawStringAnchored("Transformation", float64(vf.Width)/2, float64(vf.Height)/2, 0.5, 0.5)
	if err := dc.SavePNG(titlePath); err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("failed to save title frame: %w", err)
	}

	// 3 inputs: before(2s) -> fade to title(0.5s) -> title(1s) -> fade to after(0.5s) -> after(1s) = 5s
	filterComplex := fmt.Sprintf(
		"[0:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[before];"+
			"[1:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[title];"+
			"[2:v]scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[after];"+
			"[before][title]xfade=transition=fade:duration=0.5:offset=1.5[bt];"+
			"[bt][after]xfade=transition=fade:duration=0.5:offset=2.5",
		vf.Width, vf.Height, vf.Width, vf.Height,
		vf.Width, vf.Height, vf.Width, vf.Height,
		vf.Width, vf.Height, vf.Width, vf.Height,
	)

	cmd := exec.Command("ffmpeg",
		"-loop", "1", "-t", "2", "-i", beforePath,
		"-loop", "1", "-t", "1.5", "-i", titlePath,
		"-loop", "1", "-t", "1.5", "-i", afterPath,
		"-filter_complex", filterComplex,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-t", "5",
		"-y",
		outputPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("ffmpeg failed: %w\noutput: %s", err, string(output))
	}

	return outputPath, nil
}

// GenerateMultiPhotoProcessVideo creates a video from 3-10 ordered process images
// with crossfade transitions and optional text label overlays.
// Timing: each photo 2s display, each transition 1s crossfade.
func GenerateMultiPhotoProcessVideo(images []ProcessImage, format string) (string, error) {
	vf, ok := videoFormats[format]
	if !ok {
		vf = videoFormats["square"]
	}

	n := len(images)
	if n < 3 || n > 10 {
		return "", fmt.Errorf("need 3-10 images, got %d", n)
	}

	tmpDir, err := os.MkdirTemp("", "b4after-multiprocess-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp dir: %w", err)
	}

	// Download, resize, and save all images; draw label overlays
	imgPaths := make([]string, n)
	for i, pi := range images {
		img, err := downloadImage(pi.URL)
		if err != nil {
			os.RemoveAll(tmpDir)
			return "", fmt.Errorf("image %d: %w", i, err)
		}
		resized := imaging.Fill(img, vf.Width, vf.Height, imaging.Center, imaging.Lanczos)

		path := filepath.Join(tmpDir, fmt.Sprintf("img_%02d.png", i))

		if pi.Label != "" {
			dc := gg.NewContextForImage(resized)
			fontSize := float64(vf.Width) / 20
			_ = dc.LoadFontFace("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", fontSize)

			// Semi-transparent dark bar at bottom
			barHeight := fontSize * 2.5
			dc.SetRGBA(0, 0, 0, 0.6)
			dc.DrawRectangle(0, float64(vf.Height)-barHeight, float64(vf.Width), barHeight)
			dc.Fill()

			dc.SetRGB(1, 1, 1)
			dc.DrawStringAnchored(pi.Label, float64(vf.Width)/2, float64(vf.Height)-barHeight/2, 0.5, 0.5)

			if err := dc.SavePNG(path); err != nil {
				os.RemoveAll(tmpDir)
				return "", fmt.Errorf("failed to save image %d: %w", i, err)
			}
		} else {
			if err := imaging.Save(resized, path); err != nil {
				os.RemoveAll(tmpDir)
				return "", fmt.Errorf("failed to save image %d: %w", i, err)
			}
		}
		imgPaths[i] = path
	}

	outputPath := filepath.Join(tmpDir, "output.mp4")

	// Build FFmpeg args: each image loops for 3s (except last: 2s)
	var args []string
	for i, p := range imgPaths {
		dur := "3"
		if i == n-1 {
			dur = "2"
		}
		args = append(args, "-loop", "1", "-t", dur, "-i", p)
	}

	// Build filter_complex with chained xfade transitions
	var filterParts []string
	scaleFmt := fmt.Sprintf("scale=%d:%d:force_original_aspect_ratio=decrease,pad=%d:%d:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
		vf.Width, vf.Height, vf.Width, vf.Height)

	for i := 0; i < n; i++ {
		filterParts = append(filterParts, fmt.Sprintf("[%d:v]%s[v%d]", i, scaleFmt, i))
	}

	// Chain xfade: offset_i = i + 1
	for i := 0; i < n-1; i++ {
		leftLabel := fmt.Sprintf("v%d", i)
		if i > 0 {
			leftLabel = fmt.Sprintf("xf%d", i-1)
		}
		outLabel := ""
		if i < n-2 {
			outLabel = fmt.Sprintf("[xf%d]", i)
		}
		filterParts = append(filterParts,
			fmt.Sprintf("[%s][v%d]xfade=transition=fade:duration=1:offset=%d%s",
				leftLabel, i+1, i+1, outLabel))
	}

	filterComplex := strings.Join(filterParts, ";")
	totalDuration := fmt.Sprintf("%d", n+1)

	args = append(args,
		"-filter_complex", filterComplex,
		"-c:v", "libx264",
		"-pix_fmt", "yuv420p",
		"-t", totalDuration,
		"-y",
		outputPath,
	)

	cmd := exec.Command("ffmpeg", args...)
	cmdOutput, err := cmd.CombinedOutput()
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("ffmpeg failed: %w\noutput: %s", err, string(cmdOutput))
	}

	return outputPath, nil
}
