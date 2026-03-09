package middleware

import (
	"context"

	"github.com/xiaoboyu/b4after/backend/internal/db"
)

func GetAccessibleUserIDs(ctx context.Context, queries *db.Queries, userID string) ([]string, error) {
	ownerIDs, err := queries.GetTeamOwnerIDs(ctx, userID)
	if err != nil {
		return nil, err
	}
	ids := []string{userID}
	ids = append(ids, ownerIDs...)
	return ids, nil
}

func CanAccessResource(ctx context.Context, queries *db.Queries, callerID, resourceOwnerID string) bool {
	if callerID == resourceOwnerID {
		return true
	}
	_, err := queries.GetTeamMemberByUserAndOwner(ctx, db.GetTeamMemberByUserAndOwnerParams{
		UserID:      callerID,
		TeamOwnerID: resourceOwnerID,
	})
	return err == nil
}
