import { GalleryClient } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

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

async function getGallery(slug: string): Promise<Gallery | null> {
  try {
    const res = await fetch(`${API_URL}/galleries/slug/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getGallery(slug);

  if (!gallery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Gallery not found</p>
      </div>
    );
  }

  return <GalleryClient gallery={gallery} />;
}
