import { notFound } from "next/navigation";
import { EmbedClient } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function getComparison(slug: string) {
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

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = await getComparison(slug);
  if (!comp) notFound();

  return <EmbedClient comparison={comp} />;
}
