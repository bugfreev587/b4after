package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/xiaoboyu/b4after/backend/internal/config"
	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/handler"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
	"github.com/xiaoboyu/b4after/backend/internal/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}

	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		log.Fatal("migrations: ", err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	queries := db.New(pool)

	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.FrontendURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		handler.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Auth routes (public)
	authHandler := handler.NewAuthHandler(queries, cfg)
	r.Post("/api/auth/register", authHandler.Register)
	r.Post("/api/auth/login", authHandler.Login)
	r.Get("/api/auth/google", authHandler.GoogleRedirect)
	r.Get("/api/auth/google/callback", authHandler.GoogleCallback)

	// Public comparison by slug
	compHandler := handler.NewComparisonHandler(queries)
	r.Get("/api/comparisons/slug/{slug}", compHandler.GetBySlug)

	// Public analytics recording
	analyticsHandler := handler.NewAnalyticsHandler(queries)
	r.Post("/api/analytics/events", analyticsHandler.RecordEvent)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(cfg.JWTSecret))

		r.Get("/api/auth/me", authHandler.Me)

		// Upload
		if cfg.R2AccountID != "" {
			r2 := storage.NewR2Client(cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretAccessKey, cfg.R2BucketName, cfg.R2PublicURL)
			uploadHandler := handler.NewUploadHandler(r2)
			r.Post("/api/upload", uploadHandler.Upload)
		} else {
			uploadHandler := handler.NewNoopUploadHandler()
			r.Post("/api/upload", uploadHandler.UploadLocal)
		}

		// Comparisons
		r.Get("/api/comparisons", compHandler.List)
		r.Post("/api/comparisons", compHandler.Create)
		r.Get("/api/comparisons/{id}", compHandler.Get)
		r.Put("/api/comparisons/{id}", compHandler.Update)
		r.Delete("/api/comparisons/{id}", compHandler.Delete)

		// Analytics
		r.Get("/api/analytics/{comparisonId}", analyticsHandler.GetSummary)
	})

	log.Printf("Server starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
