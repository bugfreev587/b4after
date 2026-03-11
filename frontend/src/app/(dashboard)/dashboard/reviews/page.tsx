"use client";

import { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  content: string;
  status: string;
  reply: string | null;
  reviewer_contact: string | null;
  created_at: string;
}

interface ReviewStats {
  total: number;
  avg_rating: number;
  published_count: number;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? "text-yellow-400" : "text-gray-600"}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const api = useApiClient();

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.fetch<Review[]>("/reviews"),
      api.fetch<ReviewStats>("/reviews/stats"),
    ])
      .then(([reviewsData, statsData]) => {
        setReviews(reviewsData);
        setStats(statsData);
      })
      .catch((err) => console.error("Failed to load reviews:", err))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async (id: string) => {
    try {
      await api.fetch(`/reviews/${id}/publish`, { method: "POST" });
      loadData();
    } catch (err) {
      console.error("Failed to publish review:", err);
    }
  };

  const handleHide = async (id: string) => {
    try {
      await api.fetch(`/reviews/${id}/hide`, { method: "POST" });
      loadData();
    } catch (err) {
      console.error("Failed to hide review:", err);
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await api.fetch(`/reviews/${id}/reply`, {
        method: "POST",
        body: JSON.stringify({ reply: replyText }),
      });
      setReplyingId(null);
      setReplyText("");
      loadData();
    } catch (err) {
      console.error("Failed to reply to review:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.fetch(`/reviews/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Failed to delete review:", err);
    }
  };

  const filteredReviews =
    statusFilter === "all"
      ? reviews
      : reviews.filter((r) => r.status === statusFilter);

  if (loading) {
    return <p className="text-muted-foreground">Loading reviews...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reviews</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">
                {stats?.avg_rating ? stats.avg_rating.toFixed(1) : "N/A"}
              </p>
              {stats?.avg_rating ? (
                <Stars rating={Math.round(stats.avg_rating)} />
              ) : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats?.published_count ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-bold mb-2">No reviews yet</h2>
          <p className="text-muted-foreground">
            Reviews from your clients will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="max-w-[300px]">Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell className="font-medium">
                    {review.reviewer_name}
                  </TableCell>
                  <TableCell>
                    <Stars rating={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate">{review.content}</p>
                    {review.reply && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Reply: {review.reply}
                      </p>
                    )}
                    {replyingId === review.id && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleReply(review.id);
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReply(review.id)}
                        >
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        review.status === "published" ? "default" : "secondary"
                      }
                    >
                      {review.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {review.status === "published" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleHide(review.id)}
                        >
                          Hide
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePublish(review.id)}
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingId(review.id);
                          setReplyText(review.reply ?? "");
                        }}
                      >
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(review.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
