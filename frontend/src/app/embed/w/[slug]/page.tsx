"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Space {
  name: string;
  slug: string;
}

interface Comparison {
  id: string;
  title: string;
  slug: string;
  before_image_url: string;
  after_image_url: string;
}

export default function EmbedSpaceWallPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/spaces/${slug}/embed`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setSpace(data.space);
        setComparisons(data.comparisons || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
    );
  }

  if (!space || comparisons.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No comparisons to show.
      </div>
    );
  }

  return (
    <div className="bg-gray-950 text-white p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {comparisons.map((comp) => (
          <Link
            key={comp.id}
            href={`/s/${comp.slug}`}
            target="_blank"
            className="block"
          >
            <div className="bg-gray-900 rounded overflow-hidden border border-gray-800 hover:border-purple-500/50 transition">
              <div className="grid grid-cols-2">
                <img
                  src={comp.before_image_url}
                  alt="Before"
                  className="aspect-square object-cover w-full"
                />
                <img
                  src={comp.after_image_url}
                  alt="After"
                  className="aspect-square object-cover w-full"
                />
              </div>
              <p className="p-2 text-xs truncate">{comp.title}</p>
            </div>
          </Link>
        ))}
      </div>
      <p className="text-center text-[10px] text-gray-600 mt-3">
        Powered by B4After
      </p>
    </div>
  );
}
