package output

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/disintegration/imaging"
)

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
