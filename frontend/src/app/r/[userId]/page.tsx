"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface PublicReview {
  id: string;
  reviewer_name: string;
  rating: number;
  content: string;
  reply: string | null;
  created_at: string;
}

function Stars({
  rating,
  interactive,
  onSelect,
}: {
  rating: number;
  interactive?: boolean;
  onSelect?: (star: number) => void;
}) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`${star <= rating ? "text-yellow-400" : "text-gray-600"} ${
            interactive ? "cursor-pointer text-2xl" : ""
          }`}
          onClick={() => interactive && onSelect?.(star)}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}

type PageState = "loading" | "ready" | "success" | "error";

export default function PublicReviewWallPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [state, setState] = useState<PageState>("loading");
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  // Form state
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/reviews/public/${userId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load reviews");
        const data = await res.json();
        setReviews(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [userId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    if (!content.trim()) {
      setError("Please write a review");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/reviews/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_name: name.trim(),
          rating,
          content: content.trim(),
          reviewer_contact: contact.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit review");
      }
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-gray-400">
            This review page doesn&apos;t exist or is unavailable.
          </p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
          <p className="text-gray-400">
            Your review has been submitted and will be visible once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">Reviews</h1>

        {/* Published Reviews */}
        {reviews.length > 0 ? (
          <div className="space-y-4 mb-12">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-lg border border-gray-800 bg-gray-900 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{review.reviewer_name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Stars rating={review.rating} />
                <p className="text-sm text-gray-300 mt-2">{review.content}</p>
                {review.reply && (
                  <div className="mt-3 pl-4 border-l-2 border-purple-500">
                    <p className="text-xs text-purple-400 font-medium mb-1">
                      Business Reply
                    </p>
                    <p className="text-sm text-gray-400">{review.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-12">
            <p className="text-gray-500">
              No reviews yet. Be the first to leave one!
            </p>
          </div>
        )}

        {/* Submit Review Form */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-bold mb-4">Leave a Review</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div>
                <Stars
                  rating={rating}
                  interactive
                  onSelect={(star) =>
                    setRating(rating === star ? 0 : star)
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Review</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="Share your experience..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Contact{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Email or phone"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-md bg-purple-600 hover:bg-purple-700 disabled:opacity-50 font-medium transition"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Powered by B4After
        </p>
      </div>
    </div>
  );
}
