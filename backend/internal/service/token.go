package service

import (
	"crypto/rand"
	"encoding/base64"
)

// GenerateToken generates a URL-safe base64 token of n random bytes.
func GenerateToken(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
