"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface TimelineEntry {
  id: string;
  image_url: string;
  label: string;
  date: string;
  note: string | null;
  sort_order: number;
}

interface PublicTimeline {
  title: string;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  entries: TimelineEntry[];
}

type PageState = "loading" | "ready" | "not_found" | "error";

export default function PublicTimelinePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [state, setState] = useState<PageState>("loading");
  const [timeline, setTimeline] = useState<PublicTimeline | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/timelines/${slug}/public`)
      .then(async (res) => {
        if (res.status === 404) {
          setState("not_found");
          return;
        }
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setTimeline(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [slug]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Timeline Not Found</h1>
          <p className="text-gray-400">
            This timeline does not exist or is no longer public.
          </p>
        </div>
      </div>
    );
  }

  if (state === "error" || !timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold mb-2">Something Went Wrong</h1>
          <p className="text-gray-400">
            We couldn&apos;t load this timeline. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const entries = timeline.entries || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {timeline.title}
          </h1>
          {timeline.description && (
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {timeline.description}
            </p>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-12">
            No entries in this timeline yet.
          </p>
        ) : (
          <>
            {/* Desktop: horizontal scrollable timeline */}
            <div className="hidden md:block overflow-x-auto pb-4">
              <div className="flex gap-8 min-w-max px-4">
                {entries.map((entry, idx) => (
                  <div key={entry.id} className="flex flex-col items-center w-64 flex-shrink-0">
                    {entry.image_url && (
                      <img
                        src={entry.image_url}
                        alt={entry.label}
                        className="w-64 h-48 rounded-lg object-cover mb-4"
                      />
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      {idx < entries.length - 1 && (
                        <div className="w-40 h-0.5 bg-gray-700" />
                      )}
                    </div>
                    <h3 className="font-semibold text-sm">{entry.label}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-gray-400 mt-2 text-center line-clamp-3">
                        {entry.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden space-y-0">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 flex-shrink-0" />
                    {idx < entries.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-700" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-8 flex-1">
                    <h3 className="font-semibold text-sm">{entry.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    {entry.image_url && (
                      <img
                        src={entry.image_url}
                        alt={entry.label}
                        className="w-full rounded-lg object-cover mt-3 max-h-48"
                      />
                    )}
                    {entry.note && (
                      <p className="text-xs text-gray-400 mt-2">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        {timeline.cta_text && timeline.cta_url && (
          <div className="text-center mt-12">
            <a
              href={timeline.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 rounded-md bg-purple-600 hover:bg-purple-700 font-medium transition"
            >
              {timeline.cta_text}
            </a>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-12">
          Powered by B4After
        </p>
      </div>
    </div>
  );
}
