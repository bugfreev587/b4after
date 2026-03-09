"use client";

import { BeforeAfterSlider } from "@/components/before-after-slider";
import { buttonVariants } from "@/components/ui/button";

interface Comparison {
  id: string;
  title: string;
  description: string | null;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
  cta_text: string | null;
  cta_url: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export function PublicComparisonClient({
  comparison: comp,
}: {
  comparison: Comparison;
}) {
  const recordEvent = (eventType: string) => {
    fetch(`${API_URL}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comparison_id: comp.id,
        event_type: eventType,
      }),
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2">{comp.title}</h1>
        {comp.description && (
          <p className="text-gray-600 mb-6">{comp.description}</p>
        )}

        <BeforeAfterSlider
          beforeImage={comp.before_image_url}
          afterImage={comp.after_image_url}
          beforeLabel={comp.before_label}
          afterLabel={comp.after_label}
          onInteract={() => recordEvent("slider_interact")}
        />

        {comp.cta_text && comp.cta_url && (
          <div className="mt-6 text-center">
            <a
              href={comp.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: "lg" })}
              onClick={() => recordEvent("cta_click")}
            >
              {comp.cta_text}
            </a>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          Powered by{" "}
          <a href="/" className="text-blue-500 hover:underline">
            BeforeAfter.io
          </a>
        </div>
      </div>
    </div>
  );
}
