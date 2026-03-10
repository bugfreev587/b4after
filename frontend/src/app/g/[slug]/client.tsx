"use client";

import { BeforeAfterSlider } from "@/components/before-after-slider";

interface Comparison {
  id: string;
  title: string;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  comparisons: Comparison[];
}

export function GalleryClient({ gallery }: { gallery: Gallery }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {gallery.title}
          </h1>
          {gallery.description && (
            <p className="text-gray-400 text-lg">{gallery.description}</p>
          )}
        </div>

        {gallery.comparisons.length === 0 ? (
          <p className="text-center text-muted-foreground">
            No comparisons in this gallery yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {gallery.comparisons.map((comp) => (
              <div key={comp.id}>
                <h3 className="font-medium text-white mb-3">{comp.title}</h3>
                <BeforeAfterSlider
                  beforeImage={comp.before_image_url}
                  afterImage={comp.after_image_url}
                  beforeLabel={comp.before_label}
                  afterLabel={comp.after_label}
                />
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-gray-400 transition"
          >
            Powered by <span style={{ backgroundImage: "linear-gradient(135deg, #833AB4, #E1306C, #F77737)" }} className="bg-clip-text text-transparent font-extrabold">B4</span>After
          </a>
        </div>
      </div>
    </div>
  );
}
