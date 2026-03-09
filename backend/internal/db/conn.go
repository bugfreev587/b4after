package db

import (
	"context"
	"fmt"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}
	return pool, nil
}

func RunMigrations(databaseURL string) error {
	m, err := migrate.New("file://db/migrations", pgxConnString(databaseURL))
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	return nil
}

func pgxConnString(url string) string {
	// golang-migrate pgx/v5 driver expects "pgx5://" scheme
	if len(url) > 11 && url[:11] == "postgres://" {
		return "pgx5://" + url[11:]
	}
	if len(url) > 13 && url[:13] == "postgresql://" {
		return "pgx5://" + url[13:]
	}
	return url
}
