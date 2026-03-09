package handler

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/xiaoboyu/b4after/backend/internal/config"
	"github.com/xiaoboyu/b4after/backend/internal/db"
	"github.com/xiaoboyu/b4after/backend/internal/middleware"
)

type AuthHandler struct {
	queries     *db.Queries
	cfg         *config.Config
	oauthConfig *oauth2.Config
}

func NewAuthHandler(queries *db.Queries, cfg *config.Config) *AuthHandler {
	var oauthCfg *oauth2.Config
	if cfg.GoogleClientID != "" {
		oauthCfg = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}
	return &AuthHandler{queries: queries, cfg: cfg, oauthConfig: oauthCfg}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		Error(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if len(req.Password) < 8 {
		Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := h.queries.CreateUser(r.Context(), db.CreateUserParams{
		Email:        req.Email,
		PasswordHash: pgtype.Text{String: string(hash), Valid: true},
		Name:         req.Name,
	})
	if err != nil {
		Error(w, http.StatusConflict, "email already registered")
		return
	}

	token, err := middleware.GenerateToken(h.cfg.JWTSecret, uuidFromPgtype(user.ID))
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	JSON(w, http.StatusCreated, map[string]any{
		"token": token,
		"user":  userResponse(user),
	})
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if !user.PasswordHash.Valid {
		Error(w, http.StatusUnauthorized, "please login with Google")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash.String), []byte(req.Password)); err != nil {
		Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := middleware.GenerateToken(h.cfg.JWTSecret, uuidFromPgtype(user.ID))
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	JSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  userResponse(user),
	})
}

func (h *AuthHandler) GoogleRedirect(w http.ResponseWriter, r *http.Request) {
	if h.oauthConfig == nil {
		Error(w, http.StatusNotImplemented, "Google OAuth not configured")
		return
	}
	url := h.oauthConfig.AuthCodeURL("state")
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type googleUserInfo struct {
	Sub     string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if h.oauthConfig == nil {
		Error(w, http.StatusNotImplemented, "Google OAuth not configured")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		Error(w, http.StatusBadRequest, "missing code")
		return
	}

	oauthToken, err := h.oauthConfig.Exchange(r.Context(), code)
	if err != nil {
		Error(w, http.StatusBadRequest, "failed to exchange code")
		return
	}

	client := h.oauthConfig.Client(r.Context(), oauthToken)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to get user info")
		return
	}
	defer resp.Body.Close()

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		Error(w, http.StatusInternalServerError, "failed to decode user info")
		return
	}

	// Try to find existing user by Google ID
	user, err := h.queries.GetUserByGoogleID(r.Context(), pgtype.Text{String: info.Sub, Valid: true})
	if err == pgx.ErrNoRows {
		// Try by email, link Google ID
		user, err = h.queries.GetUserByEmail(r.Context(), info.Email)
		if err == pgx.ErrNoRows {
			// Create new user
			user, err = h.queries.CreateUser(r.Context(), db.CreateUserParams{
				Email:     info.Email,
				Name:      info.Name,
				GoogleID:  pgtype.Text{String: info.Sub, Valid: true},
				AvatarUrl: pgtype.Text{String: info.Picture, Valid: true},
			})
		}
	}
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to find or create user")
		return
	}

	token, err := middleware.GenerateToken(h.cfg.JWTSecret, uuidFromPgtype(user.ID))
	if err != nil {
		Error(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	// Redirect to frontend with token
	http.Redirect(w, r, h.cfg.FrontendURL+"/auth/callback?token="+token, http.StatusTemporaryRedirect)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	pgID := pgtype.UUID{Bytes: userID, Valid: true}
	user, err := h.queries.GetUserByID(r.Context(), pgID)
	if err != nil {
		Error(w, http.StatusNotFound, "user not found")
		return
	}

	JSON(w, http.StatusOK, userResponse(user))
}

func userResponse(u db.User) map[string]any {
	return map[string]any{
		"id":         uuidFromPgtype(u.ID).String(),
		"email":      u.Email,
		"name":       u.Name,
		"avatar_url": pgtextToPtr(u.AvatarUrl),
		"plan":       string(u.Plan),
		"created_at": u.CreatedAt.Time,
	}
}

func uuidFromPgtype(id pgtype.UUID) uuid.UUID {
	return uuid.UUID(id.Bytes)
}

func pgtextToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}
