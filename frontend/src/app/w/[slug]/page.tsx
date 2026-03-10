"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Space {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  cover_image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_type: string;
  services: string[] | null;
}

interface Comparison {
  id: string;
  title: string;
  slug: string;
  before_image_url: string;
  after_image_url: string;
  category: string;
  view_count: number;
}

export default function PublicSpaceWallPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/spaces/${slug}/public`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setSpace(data.space);
        setComparisons(data.comparisons || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Space Not Found</h1>
          <p className="text-gray-400">
            This space doesn&apos;t exist or is private.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {space.cover_image_url && (
            <img
              src={space.cover_image_url}
              alt={space.name}
              className="w-full max-h-64 object-cover rounded-lg mb-6"
            />
          )}
          <h1 className="text-3xl font-bold mb-2">{space.name}</h1>
          {space.description && (
            <p className="text-gray-400 text-lg">{space.description}</p>
          )}
          {space.services && space.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {space.services.map((svc, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-sm"
                >
                  {svc}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Comparisons grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {comparisons.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            No comparisons published yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisons.map((comp) => (
              <Link
                key={comp.id}
                href={`/s/${comp.slug}`}
                className="group block"
              >
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-purple-500/50 transition">
                  <div className="grid grid-cols-2">
                    <div className="relative">
                      <img
                        src={comp.before_image_url}
                        alt="Before"
                        className="aspect-square object-cover w-full"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/70 text-xs px-2 py-0.5 rounded">
                        Before
                      </span>
                    </div>
                    <div className="relative">
                      <img
                        src={comp.after_image_url}
                        alt="After"
                        className="aspect-square object-cover w-full"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-xs px-2 py-0.5 rounded">
                        After
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm truncate group-hover:text-purple-300 transition">
                      {comp.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {comp.view_count} views
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* CTA */}
      {space.cta_type !== "none" && space.cta_text && space.cta_url && (
        <section className="border-t border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-12 text-center">
            <a
              href={space.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition"
            >
              {space.cta_text}
            </a>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 text-center">
        <p className="text-xs text-gray-600">
          Powered by{" "}
          <a
            href="https://b4after.io"
            className="text-gray-500 hover:text-gray-400"
          >
            B4After
          </a>
        </p>
      </footer>
    </div>
  );
}
