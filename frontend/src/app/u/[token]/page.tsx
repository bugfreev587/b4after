"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface RequestInfo {
  id: string;
  request_type: string;
  instruction_note: string | null;
  client_name: string | null;
  service_type: string | null;
  expires_at: string;
}

type PageState = "loading" | "form" | "success" | "expired" | "error";

export default function ClientUploadPage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("loading");
  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/requests/${token}`)
      .then(async (res) => {
        if (res.status === 410) {
          setState("expired");
          return;
        }
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setRequest(data);
        setState("form");
      })
      .catch(() => setState("error"));
  }, [token]);

  const uploadPhoto = useCallback(
    async (file: File, type: "before" | "after") => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Please upload a JPEG, PNG, WebP, or GIF image");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File must be under 10MB");
        return;
      }
      setError("");
      setUploading(type);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_URL}/requests/${token}/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        if (type === "before") setBeforeUrl(url);
        else setAfterUrl(url);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(null);
      }
    },
    [token],
  );

  const handleSubmit = async () => {
    if (!request) return;
    const needsBefore =
      request.request_type === "both" ||
      request.request_type === "before_only";
    const needsAfter =
      request.request_type === "both" ||
      request.request_type === "after_only";

    if (needsBefore && !beforeUrl) {
      setError("Please upload your before photo");
      return;
    }
    if (needsAfter && !afterUrl) {
      setError("Please upload your after photo");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/requests/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          before_image_url: beforeUrl,
          after_image_url: afterUrl,
          review_rating: reviewRating,
          review_content: reviewContent,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Submission failed");
      }
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
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

  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
          <p className="text-gray-400">
            This upload request has expired. Please contact the business for a
            new link.
          </p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Request Not Found</h1>
          <p className="text-gray-400">
            This upload link is invalid or has already been used.
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
            Your photos have been submitted for review. You&apos;ll hear back
            soon!
          </p>
        </div>
      </div>
    );
  }

  const needsBefore =
    request!.request_type === "both" ||
    request!.request_type === "before_only";
  const needsAfter =
    request!.request_type === "both" ||
    request!.request_type === "after_only";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Upload Your Photos</h1>
          {request!.client_name && (
            <p className="text-gray-400">Hi {request!.client_name}!</p>
          )}
          {request!.instruction_note && (
            <p className="text-gray-400 mt-2 text-sm">
              {request!.instruction_note}
            </p>
          )}
          {request!.service_type && (
            <p className="text-sm text-purple-400 mt-1">
              Service: {request!.service_type}
            </p>
          )}
        </div>

        <div className="space-y-6">
          {needsBefore && (
            <PhotoUploadZone
              label="Before Photo"
              url={beforeUrl}
              uploading={uploading === "before"}
              onFile={(f) => uploadPhoto(f, "before")}
              onClear={() => setBeforeUrl("")}
            />
          )}

          {needsAfter && (
            <PhotoUploadZone
              label="After Photo"
              url={afterUrl}
              uploading={uploading === "after"}
              onFile={(f) => uploadPhoto(f, "after")}
              onClear={() => setAfterUrl("")}
            />
          )}

          {/* Review section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Rating (optional)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setReviewRating(reviewRating === star ? 0 : star)
                  }
                  className={`text-2xl ${
                    star <= reviewRating
                      ? "text-yellow-400"
                      : "text-gray-600"
                  }`}
                >
                  &#9733;
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Review (optional)
            </label>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              placeholder="Share your experience..."
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
            {submitting ? "Submitting..." : "Submit Photos"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Powered by B4After
        </p>
      </div>
    </div>
  );
}

function PhotoUploadZone({
  label,
  url,
  uploading,
  onFile,
  onClear,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
        {url ? (
          <div className="relative">
            <img
              src={url}
              alt={label}
              className="max-h-48 mx-auto rounded"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center"
            >
              &times;
            </button>
          </div>
        ) : uploading ? (
          <p className="text-sm text-gray-400 py-4">Uploading...</p>
        ) : (
          <div className="py-4">
            <p className="text-sm text-gray-400 mb-1">
              Tap to upload or drag & drop
            </p>
            <p className="text-xs text-gray-600">JPEG, PNG, WebP (max 10MB)</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
