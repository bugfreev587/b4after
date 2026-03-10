package handler

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stripe/stripe-go/v82"
	billingportalsession "github.com/stripe/stripe-go/v82/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/webhook"

	"github.com/xiaoboyu/b4after/backend/internal/config"
	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type BillingHandler struct {
	queries *db.Queries
	cfg     *config.Config
}

func NewBillingHandler(queries *db.Queries, cfg *config.Config) *BillingHandler {
	stripe.Key = cfg.StripeSecretKey
	return &BillingHandler{queries: queries, cfg: cfg}
}

type checkoutRequest struct {
	Plan     string `json:"plan"`
	Interval string `json:"interval"` // "monthly" (default) or "annual"
}

func (h *BillingHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req checkoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Interval == "" {
		req.Interval = "monthly"
	}

	var priceID string
	switch req.Plan {
	case "pro":
		if req.Interval == "annual" {
			priceID = h.cfg.StripePriceProAnnual
		} else {
			priceID = h.cfg.StripePriceProMonthly
		}
	case "business":
		if req.Interval == "annual" {
			priceID = h.cfg.StripePriceBusinessAnnual
		} else {
			priceID = h.cfg.StripePriceBusinessMonthly
		}
	default:
		Error(w, http.StatusBadRequest, "invalid plan")
		return
	}

	if priceID == "" {
		Error(w, http.StatusInternalServerError, "stripe price not configured")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(h.cfg.FrontendURL + "/dashboard/billing?success=true"),
		CancelURL:  stripe.String(h.cfg.FrontendURL + "/dashboard/billing?canceled=true"),
		SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
			TrialPeriodDays: stripe.Int64(14),
			Metadata: map[string]string{
				"user_id": userID,
				"plan":    req.Plan,
			},
		},
		Metadata: map[string]string{
			"user_id": userID,
			"plan":    req.Plan,
		},
	}

	if user.StripeCustomerID.Valid {
		params.Customer = stripe.String(user.StripeCustomerID.String)
	} else if user.Email != "" {
		params.CustomerEmail = stripe.String(user.Email)
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create checkout session")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

func (h *BillingHandler) CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	if !user.StripeCustomerID.Valid {
		Error(w, http.StatusBadRequest, "no stripe customer found")
		return
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(user.StripeCustomerID.String),
		ReturnURL: stripe.String(h.cfg.FrontendURL + "/dashboard/billing"),
	}

	session, err := billingportalsession.New(params)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to create portal session")
		return
	}

	JSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

func (h *BillingHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 65536))
	if err != nil {
		Error(w, http.StatusBadRequest, "failed to read body")
		return
	}

	event, err := webhook.ConstructEvent(body, r.Header.Get("Stripe-Signature"), h.cfg.StripeWebhookSecret)
	if err != nil {
		Error(w, http.StatusBadRequest, "invalid webhook signature")
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			log.Printf("webhook: failed to unmarshal checkout session: %v", err)
			break
		}
		userID := session.Metadata["user_id"]
		plan := session.Metadata["plan"]
		if userID != "" && plan != "" {
			err := h.queries.UpdateUserPlan(r.Context(), db.UpdateUserPlanParams{
				ID:               userID,
				Plan:             db.UserPlan(plan),
				StripeCustomerID: pgtype.Text{String: session.Customer.ID, Valid: session.Customer.ID != ""},
			})
			if err != nil {
				log.Printf("webhook: failed to update user plan: %v", err)
			}
		}

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			log.Printf("webhook: failed to unmarshal subscription: %v", err)
			break
		}
		// If subscription is canceled or past_due, we could downgrade
		// For now, we rely on customer.subscription.deleted for downgrades

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			log.Printf("webhook: failed to unmarshal subscription: %v", err)
			break
		}
		if sub.Customer != nil {
			customerID := sub.Customer.ID
			// Find user by stripe customer ID and downgrade to free
			// Since we don't have a query by stripe_customer_id, we use metadata
			if sub.Metadata != nil {
				if userID, ok := sub.Metadata["user_id"]; ok {
					err := h.queries.UpdateUserPlan(r.Context(), db.UpdateUserPlanParams{
						ID:               userID,
						Plan:             db.UserPlanFree,
						StripeCustomerID: pgtype.Text{String: customerID, Valid: true},
					})
					if err != nil {
						log.Printf("webhook: failed to downgrade user plan: %v", err)
					}
				}
			}
		}
	}

	w.WriteHeader(http.StatusOK)
}
