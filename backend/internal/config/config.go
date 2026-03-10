package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	FrontendURL  string
	FrontendURLs []string

	ClerkSecretKey string

	R2AccountID       string
	R2AccessKeyID     string
	R2SecretAccessKey string
	R2BucketName      string
	R2PublicURL       string

	StripeSecretKey            string
	StripeWebhookSecret        string
	StripePriceProMonthly      string
	StripePriceBusinessMonthly string
	StripePriceProAnnual       string
	StripePriceBusinessAnnual  string

	ResendAPIKey string

	CustomDomainBase string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:              getEnv("PORT", "3001"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:3000"),
		ClerkSecretKey:    os.Getenv("CLERK_SECRET_KEY"),
		R2AccountID:       os.Getenv("R2_ACCOUNT_ID"),
		R2AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2BucketName:      getEnv("R2_BUCKET_NAME", "b4after"),
		R2PublicURL:       os.Getenv("R2_PUBLIC_URL"),

		StripeSecretKey:          os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:      os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePriceProMonthly:      os.Getenv("STRIPE_PRICE_PRO_MONTHLY"),
		StripePriceBusinessMonthly: os.Getenv("STRIPE_PRICE_BUSINESS_MONTHLY"),
		StripePriceProAnnual:       os.Getenv("STRIPE_PRICE_PRO_ANNUAL"),
		StripePriceBusinessAnnual:  os.Getenv("STRIPE_PRICE_BUSINESS_ANNUAL"),

		ResendAPIKey: os.Getenv("RESEND_API_KEY"),

		CustomDomainBase: getEnv("CUSTOM_DOMAIN_BASE", "beforeafter.io"),
	}

	// Support comma-separated FRONTEND_URL for multiple origins
	for _, u := range strings.Split(cfg.FrontendURL, ",") {
		u = strings.TrimSpace(u)
		if u != "" {
			cfg.FrontendURLs = append(cfg.FrontendURLs, u)
		}
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.ClerkSecretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
