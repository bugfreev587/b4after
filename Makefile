.PHONY: dev-db dev-backend dev-frontend sqlc migrate-up migrate-down

dev-db:
	docker compose up -d

dev-backend:
	cd backend && go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

sqlc:
	cd backend && sqlc generate

migrate-up:
	cd backend && go run cmd/migrate/main.go up

migrate-down:
	cd backend && go run cmd/migrate/main.go down
