package main

import (
	"context"
	"log"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"golang.org/x/time/rate"

	"github.com/xiaoboyu/b4after/backend/internal/config"
	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/email"
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
		AllowedOrigins:   cfg.FrontendURLs,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.RateLimitMiddleware(rate.Limit(20), 40)) // 20 req/s per IP, burst 40

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

	// Public space wall
	spaceHandler := handler.NewSpaceHandler(queries)
	r.Get("/api/spaces/{slug}/public", spaceHandler.GetPublicWall)
	r.Get("/api/spaces/{slug}/embed", spaceHandler.GetEmbedData)

	// Email client (for upload requests)
	emailClient := email.NewClient(cfg.ResendAPIKey)

	// Public upload request endpoints
	uploadReqHandler := handler.NewUploadRequestHandler(queries, r2, emailClient, cfg.FrontendURL)
	r.Get("/api/requests/{token}", uploadReqHandler.GetRequestByToken)
	r.Post("/api/requests/{token}/upload", uploadReqHandler.UploadPhoto)
	r.Post("/api/requests/{token}/submit", uploadReqHandler.SubmitRequest)

	// Public reviews
	reviewHandler := handler.NewReviewHandler(queries)
	r.Post("/api/reviews/{userId}", reviewHandler.Create)
	r.Get("/api/reviews/public/{userId}", reviewHandler.GetPublicReviews)

	// Public timeline by slug
	timelineHandler := handler.NewTimelineHandler(queries)
	r.Get("/api/timelines/{slug}/public", timelineHandler.GetPublic)

	// Public leads (strict rate limit: 5 req/min per IP)
	leadHandler := handler.NewLeadHandler(queries, emailClient)
	r.Group(func(r chi.Router) {
		r.Use(middleware.RateLimitMiddleware(rate.Limit(5.0/60.0), 5))
		r.Post("/api/leads", leadHandler.Create)
	})

	// Stripe webhook (public, verified by signature)
	if cfg.StripeSecretKey != "" {
		billingHandler := handler.NewBillingHandler(queries, cfg)
		r.Post("/api/webhooks/stripe", billingHandler.HandleWebhook)
	}

	// Public invite endpoint
	tenantHandler := handler.NewTenantHandler(queries, emailClient, cfg.FrontendURL, cfg)
	r.Get("/api/invites/{token}", tenantHandler.GetInviteByToken)

	// Protected routes (combined auth: API key or Clerk JWT)
	r.Group(func(r chi.Router) {
		r.Use(middleware.CombinedAuthMiddleware(queries))

		// User (before TenantMiddleware — auto-creates tenant)
		userHandler := handler.NewUserHandler(queries)
		r.Get("/api/users/me", userHandler.Me)

		// Accept invite (needs auth but not tenant)
		r.Post("/api/invites/{token}/accept", tenantHandler.AcceptInvite)

		// Upload (no tenant needed)
		if r2 != nil {
			uploadHandler := handler.NewUploadHandler(r2)
			r.Post("/api/upload", uploadHandler.Upload)
		} else {
			uploadHandler := handler.NewNoopUploadHandler()
			r.Post("/api/upload", uploadHandler.UploadLocal)
		}

		// All routes below require tenant context
		r.Group(func(r chi.Router) {
			r.Use(middleware.TenantMiddleware(queries))

			// Tenant
			r.Get("/api/tenant", tenantHandler.GetTenant)
			r.Get("/api/tenant/members", tenantHandler.ListMembers)
			// Owner-only tenant management
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireOwner())
				r.Put("/api/tenant", tenantHandler.UpdateTenant)
				r.Post("/api/tenant/cancel", tenantHandler.CancelService)
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequirePlan(db.UserPlanBusiness))
					r.Post("/api/tenant/invites", tenantHandler.InviteMember)
					r.Get("/api/tenant/invites", tenantHandler.ListInvites)
					r.Delete("/api/tenant/invites/{id}", tenantHandler.CancelInvite)
					r.Post("/api/tenant/invites/{id}/resend", tenantHandler.ResendInvite)
					r.Delete("/api/tenant/members/{id}", tenantHandler.RemoveMember)
				})
			})

			// Spaces
			r.Get("/api/spaces", spaceHandler.List)
			r.Post("/api/spaces", spaceHandler.Create)
			r.Get("/api/spaces/{id}", spaceHandler.Get)
			r.Put("/api/spaces/{id}", spaceHandler.Update)
			r.Delete("/api/spaces/{id}", spaceHandler.Delete)

			// Comparisons
			r.Get("/api/comparisons", compHandler.List)
			r.Post("/api/comparisons", compHandler.Create)
			r.Get("/api/comparisons/{id}", compHandler.Get)
			r.Put("/api/comparisons/{id}", compHandler.Update)
			r.Delete("/api/comparisons/{id}", compHandler.Delete)

			// Space-comparison assignments (junction table)
			r.Post("/api/spaces/{spaceId}/comparisons/{compId}", compHandler.AddToSpace)
			r.Delete("/api/spaces/{spaceId}/comparisons/{compId}", compHandler.RemoveFromSpace)

			// Output generation
			outputHandler := handler.NewOutputHandler(queries, r2)
			r.Post("/api/comparisons/{id}/image", outputHandler.GenerateImage)

			// Video generation (pro/business only)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanPro, db.UserPlanBusiness))
				r.Post("/api/comparisons/{id}/video", outputHandler.GenerateVideo)
				r.Post("/api/comparisons/{id}/transform-video", outputHandler.GenerateTransformVideo)
				r.Post("/api/comparisons/{id}/process-video", outputHandler.GenerateProcessVideo)
				r.Post("/api/comparisons/{id}/multi-process-video", outputHandler.GenerateMultiPhotoProcessVideo)
			})

			// Analytics
			r.Get("/api/analytics/{comparisonId}", analyticsHandler.GetSummary)

			// Advanced analytics (pro/business)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanPro, db.UserPlanBusiness))
				r.Get("/api/analytics/{comparisonId}/advanced", analyticsHandler.GetAdvancedAnalytics)
			})
			// CSV export (business only)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanBusiness))
				r.Get("/api/analytics/{comparisonId}/export", analyticsHandler.ExportCSV)
			})

			// Brands (pro/business only)
			brandHandler := handler.NewBrandHandler(queries)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanPro, db.UserPlanBusiness))
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

			// Upload Requests (protected routes)
			r.Post("/api/spaces/{id}/requests", uploadReqHandler.CreateRequest)
			r.Get("/api/spaces/{id}/requests", uploadReqHandler.ListRequests)
			r.Post("/api/requests/{id}/remind", uploadReqHandler.SendReminder)
			r.Post("/api/requests/{id}/approve", uploadReqHandler.Approve)
			r.Post("/api/requests/{id}/reject", uploadReqHandler.Reject)

			// Reviews (protected)
			r.Get("/api/reviews", reviewHandler.List)
			r.Get("/api/reviews/stats", reviewHandler.GetStats)
			r.Post("/api/reviews/{id}/publish", reviewHandler.Publish)
			r.Post("/api/reviews/{id}/hide", reviewHandler.Hide)
			r.Delete("/api/reviews/{id}", reviewHandler.Delete)
			// Reply requires Pro+
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanPro, db.UserPlanBusiness))
				r.Post("/api/reviews/{id}/reply", reviewHandler.Reply)
			})

			// Timelines
			r.Get("/api/timelines", timelineHandler.List)
			r.Post("/api/timelines", timelineHandler.Create)
			r.Get("/api/timelines/{id}", timelineHandler.Get)
			r.Put("/api/timelines/{id}", timelineHandler.Update)
			r.Delete("/api/timelines/{id}", timelineHandler.Delete)
			r.Post("/api/timelines/{id}/entries", timelineHandler.CreateEntry)
			r.Put("/api/timelines/{id}/entries/{entryId}", timelineHandler.UpdateEntry)
			r.Delete("/api/timelines/{id}/entries/{entryId}", timelineHandler.DeleteEntry)
			r.Post("/api/timelines/{id}/entries/reorder", timelineHandler.ReorderEntries)

			// Materials (QR)
			materialHandler := handler.NewMaterialHandler(queries, r2)
			r.Post("/api/materials/generate", materialHandler.Generate)

			// Leads (protected)
			r.Get("/api/leads", leadHandler.List)
			r.Get("/api/leads/stats", leadHandler.GetStats)
			r.Put("/api/leads/{id}/status", leadHandler.UpdateStatus)
			r.Get("/api/leads/form-config", leadHandler.GetFormConfig)
			r.Put("/api/leads/form-config", leadHandler.UpdateFormConfig)

			// Benchmarks
			benchmarkHandler := handler.NewBenchmarkHandler(queries)
			r.Get("/api/benchmarks/me", benchmarkHandler.GetUserBenchmark)
			r.Get("/api/benchmarks/{category}", benchmarkHandler.GetIndustryBenchmark)
			// Achievements (Pro+)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanPro, db.UserPlanBusiness))
				r.Get("/api/achievements", benchmarkHandler.GetAchievements)
			})

			// Content Calendar
			calendarHandler := handler.NewContentCalendarHandler(queries)
			r.Get("/api/content-calendar", calendarHandler.List)
			r.Post("/api/content-calendar/generate", calendarHandler.Generate)
			r.Put("/api/content-calendar/{id}/status", calendarHandler.UpdateStatus)
			r.Get("/api/content-calendar/settings", calendarHandler.GetSettings)
			r.Put("/api/content-calendar/settings", calendarHandler.UpdateSettings)

			// Subdomain settings (business only)
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePlan(db.UserPlanBusiness))
				r.Get("/api/settings/subdomain", subdomainHandler.Get)
				r.Post("/api/settings/subdomain", subdomainHandler.Update)
				})

			// Billing (owner only)
			if cfg.StripeSecretKey != "" {
				r.Group(func(r chi.Router) {
					r.Use(middleware.RequireOwner())
					billingHandler := handler.NewBillingHandler(queries, cfg)
					r.Post("/api/billing/checkout", billingHandler.CreateCheckoutSession)
					r.Post("/api/billing/portal", billingHandler.CreatePortalSession)
					r.Post("/api/billing/checkout/verify", billingHandler.VerifyCheckoutSession)
					r.Get("/api/billing/invoices", billingHandler.ListInvoices)
				})
			}
		})
	})

	log.Printf("CORS allowed origins: %v", cfg.FrontendURLs)
	log.Printf("Server starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
