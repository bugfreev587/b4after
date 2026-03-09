import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicComparisonClient } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface Comparison {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
  cta_text: string | null;
  cta_url: string | null;
}

async function getComparison(slug: string): Promise<Comparison | null> {
  try {
    const res = await fetch(`${API_URL}/comparisons/slug/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comp = await getComparison(slug);
  if (!comp) return { title: "Not Found" };

  return {
    title: `${comp.title} | BeforeAfter.io`,
    description: comp.description || `See the before and after: ${comp.title}`,
    openGraph: {
      title: comp.title,
      description:
        comp.description || `See the before and after: ${comp.title}`,
      images: [comp.after_image_url],
    },
  };
}

export default async function PublicComparisonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = await getComparison(slug);
  if (!comp) notFound();

  return <PublicComparisonClient comparison={comp} />;
}
