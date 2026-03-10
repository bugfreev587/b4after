# BeforeAfter.io

A SaaS platform for service businesses (beauty, fitness, dental, renovation) to create interactive before/after comparison showcases. Upload photos, generate interactive slider pages, comparison videos, and shareable galleries.

## Features

### Core
- **Interactive Before/After Slider** — Drag-to-compare slider pages with public sharing via slug URLs
- **Photo Upload** — Upload before/after images stored on Cloudflare R2
- **Dashboard** — Manage all comparisons with create, edit, delete
- **Public Sharing** — Each comparison gets a shareable `/s/{slug}` URL
- **Embeddable Widget** — Embed comparisons on external sites via `/embed/{slug}` iframe
- **Analytics** — Track views, slider interactions, CTA clicks, and shares per comparison

### Output Generation
- **Static Comparison Image** — Generate a side-by-side comparison image
- **Slider Animation Video** — Animated before/after with sliding reveal (square, portrait, landscape)
- **AI Transformation Video** — Morphing/transition effect between before and after images (Pro+)
- **Process Video** — Animated sequence with before/after labels (Pro+)
- **Multi-Photo Process Video** — 3-10 photos with crossfade transitions (Pro+)

### Branding & Galleries (Pro+)
- **Custom Branding** — Logo, colors, and website URL on comparison pages
- **Galleries** — Curated collections of comparisons with public gallery pages (`/g/{slug}`)

### Teams & Custom Domains (Business+)
- **Team Management** — Invite members with owner/admin/member roles
- **Custom Subdomains** — Portfolio pages at `{subdomain}.beforeafter.io`

### Billing
- **Stripe Subscriptions** — Free, Pro, and Business plans with checkout and customer portal

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend | Go 1.25, Chi v5 router |
| Database | PostgreSQL 16, sqlc (type-safe queries), golang-migrate |
| Auth | Clerk (clerk-sdk-go + @clerk/nextjs) |
| Storage | Cloudflare R2 (S3-compatible) |
| Payments | Stripe (subscriptions) |
| Video | FFmpeg via os/exec |
| Image Processing | disintegration/imaging, fogleman/gg |
| Deployment | Frontend → Vercel, Backend → Railway (Docker) |

## Project Structure

```
b4after/
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Sign-in, sign-up pages (Clerk)
│   │   │   ├── (dashboard)/    # Dashboard, comparisons, galleries, billing, team, settings
│   │   │   ├── (marketing)/    # Landing page
│   │   │   ├── embed/[slug]/   # Embeddable comparison widget
│   │   │   ├── g/[slug]/       # Public gallery page
│   │   │   ├── p/[subdomain]/  # Custom subdomain portfolio
│   │   │   └── s/[slug]/       # Public comparison slider page
│   │   ├── components/         # Shared components (slider, forms, image upload)
│   │   └── lib/                # API client, utilities
│   └── package.json
├── backend/                    # Go API server
│   ├── cmd/
│   │   ├── server/main.go      # HTTP server entrypoint
│   │   └── migrate/main.go     # Migration runner
│   ├── internal/
│   │   ├── api/                # Route handlers (comparisons, galleries, billing, etc.)
│   │   ├── auth/               # Clerk authentication middleware
│   │   ├── middleware/         # CORS, plan-based access control
│   │   ├── storage/            # R2/local file storage
│   │   └── video/              # FFmpeg video generation
│   ├── db/
│   │   ├── migrations/         # SQL migration files
│   │   ├── queries/            # sqlc query definitions
│   │   └── sqlc/               # Generated Go code
│   └── go.mod
├── docker-compose.yml          # Local PostgreSQL
├── Makefile                    # Dev commands
└── CLAUDE.md                   # AI assistant instructions
```

## Getting Started

### Prerequisites

- Go 1.25+
- Node.js 18+
- Docker (for PostgreSQL)
- FFmpeg (for video generation)

### Environment Variables

**Backend** (`backend/.env`):
```
DATABASE_URL=postgres://user:pass@localhost:5432/b4after?sslmode=disable
CLERK_SECRET_KEY=sk_test_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=b4after
R2_PUBLIC_URL=https://...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Development

```bash
make dev-db          # Start PostgreSQL
make migrate-up      # Run database migrations
make dev-backend     # Start Go server on :3001
make dev-frontend    # Start Next.js on :3000
make sqlc            # Regenerate sqlc code after query changes
make migrate-down    # Rollback last migration
```

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/comparisons/slug/{slug}` | Get comparison by slug |
| GET | `/api/galleries/slug/{slug}` | Get gallery by slug |
| GET | `/api/subdomain/{subdomain}` | Get subdomain portfolio |
| POST | `/api/analytics/events` | Record analytics event |
| POST | `/api/webhooks/stripe` | Stripe webhook |

### Protected (requires Clerk auth)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me` | Current user profile |
| POST | `/api/upload` | Upload file to R2 |
| GET/POST | `/api/comparisons` | List / create comparisons |
| GET/PUT/DELETE | `/api/comparisons/{id}` | Get / update / delete comparison |
| POST | `/api/comparisons/{id}/image` | Generate comparison image |
| POST | `/api/comparisons/{id}/video` | Generate slider video |
| POST | `/api/comparisons/{id}/transform-video` | Generate transformation video |
| POST | `/api/comparisons/{id}/process-video` | Generate process video |
| POST | `/api/comparisons/{id}/multi-process-video` | Generate multi-photo process video |
| GET | `/api/analytics/{comparisonId}` | Analytics summary |
| GET/POST | `/api/brands` | List / create brands |
| PUT | `/api/brands/{id}` | Update brand |
| GET/POST | `/api/galleries` | List / create galleries |
| GET/PUT/DELETE | `/api/galleries/{id}` | Get / update / delete gallery |
| POST | `/api/galleries/{id}/comparisons` | Add comparison to gallery |
| DELETE | `/api/galleries/{id}/comparisons/{compId}` | Remove from gallery |
| POST/GET | `/api/team/members` | Invite / list team members |
| PUT/DELETE | `/api/team/members/{id}` | Update role / remove member |
| GET | `/api/team/memberships` | List team memberships |
| GET/POST | `/api/settings/subdomain` | Get / update custom subdomain |
| POST | `/api/billing/checkout` | Create Stripe checkout session |
| POST | `/api/billing/portal` | Create Stripe portal session |

## Plans

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Comparisons | Unlimited | Unlimited | Unlimited |
| Interactive slider pages | Yes | Yes | Yes |
| Static comparison images | Yes | Yes | Yes |
| Basic analytics | Yes | Yes | Yes |
| Public sharing | Yes | Yes | Yes |
| Custom branding | - | Yes | Yes |
| Slider animation video | - | Yes | Yes |
| Transformation video | - | Yes | Yes |
| Process video | - | Yes | Yes |
| Multi-photo process video | - | Yes | Yes |
| Galleries | - | Yes | Yes |
| Team management | - | - | Yes |
| Custom subdomains | - | - | Yes |
