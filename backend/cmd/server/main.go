package main

import (
	"context"
	"log"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
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

	// Initialize Clerk SDK
	clerk.SetKey(cfg.ClerkSecretKey)

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

	// Optional R2 client
	var r2 *storage.R2Client
	if cfg.R2AccountID != "" {
		r2 = storage.NewR2Client(cfg.R2AccountID, cfg.R2AccessKeyID, cfg.R2SecretAccessKey, cfg.R2BucketName, cfg.R2PublicURL)
	}

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

	// Public comparison by slug
	compHandler := handler.NewComparisonHandler(queries)
	r.Get("/api/comparisons/slug/{slug}", compHandler.GetBySlug)

	// Public analytics recording
	analyticsHandler := handler.NewAnalyticsHandler(queries)
	r.Post("/api/analytics/events", analyticsHandler.RecordEvent)

	// Public gallery by slug
	galleryHandler := handler.NewGalleryHandler(queries)
	r.Get("/api/galleries/slug/{slug}", galleryHandler.GetBySlug)

	// Public subdomain page
	subdomainHandler := handler.NewSubdomainHandler(queries, cfg)
	r.Get("/api/subdomain/{subdomain}", subdomainHandler.GetPublicPage)

	// Stripe webhook (public, verified by signature)
	if cfg.StripeSecretKey != "" {
		billingHandler := handler.NewBillingHandler(queries, cfg)
		r.Post("/api/webhooks/stripe", billingHandler.HandleWebhook)
	}

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.ClerkAuthMiddleware(queries))

		// User
		userHandler := handler.NewUserHandler(queries)
		r.Get("/api/users/me", userHandler.Me)

		// Upload
		if r2 != nil {
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

		// Output generation
		outputHandler := handler.NewOutputHandler(queries, r2)
		r.Post("/api/comparisons/{id}/image", outputHandler.GenerateImage)

		// Video generation (pro/business only)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequirePlan(queries, db.UserPlanPro, db.UserPlanBusiness))
			r.Post("/api/comparisons/{id}/video", outputHandler.GenerateVideo)
			r.Post("/api/comparisons/{id}/transform-video", outputHandler.GenerateTransformVideo)
			r.Post("/api/comparisons/{id}/process-video", outputHandler.GenerateProcessVideo)
			r.Post("/api/comparisons/{id}/multi-process-video", outputHandler.GenerateMultiPhotoProcessVideo)
		})

		// Analytics
		r.Get("/api/analytics/{comparisonId}", analyticsHandler.GetSummary)

		// Brands (pro/business only)
		brandHandler := handler.NewBrandHandler(queries)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequirePlan(queries, db.UserPlanPro, db.UserPlanBusiness))
			r.Post("/api/brands", brandHandler.Create)
			r.Put("/api/brands/{id}", brandHandler.Update)
		})
		r.Get("/api/brands", brandHandler.List)

		// Galleries
		r.Get("/api/galleries", galleryHandler.List)
		r.Post("/api/galleries", galleryHandler.Create)
		r.Get("/api/galleries/{id}", galleryHandler.Get)
		r.Put("/api/galleries/{id}", galleryHandler.Update)
		r.Delete("/api/galleries/{id}", galleryHandler.Delete)
		r.Post("/api/galleries/{id}/comparisons", galleryHandler.AddComparison)
		r.Delete("/api/galleries/{id}/comparisons/{compId}", galleryHandler.RemoveComparison)

		// Teams (business only)
		teamHandler := handler.NewTeamHandler(queries)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequirePlan(queries, db.UserPlanBusiness))
			r.Post("/api/team/members", teamHandler.InviteMember)
			r.Get("/api/team/members", teamHandler.ListMembers)
			r.Put("/api/team/members/{id}", teamHandler.UpdateMember)
			r.Delete("/api/team/members/{id}", teamHandler.RemoveMember)
			r.Get("/api/team/memberships", teamHandler.ListMemberships)
		})

		// Subdomain settings (business only)
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequirePlan(queries, db.UserPlanBusiness))
			r.Get("/api/settings/subdomain", subdomainHandler.Get)
			r.Post("/api/settings/subdomain", subdomainHandler.Update)
		})

		// Billing
		if cfg.StripeSecretKey != "" {
			billingHandler := handler.NewBillingHandler(queries, cfg)
			r.Post("/api/billing/checkout", billingHandler.CreateCheckoutSession)
			r.Post("/api/billing/portal", billingHandler.CreatePortalSession)
		}
	})

	log.Printf("Server starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
