import { SubdomainPageClient } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface SubdomainPageData {
  user: { name: string; avatar_url: string | null };
  comparisons: Array<{
    id: string;
    title: string;
    slug: string;
    before_image_url: string;
    after_image_url: string;
    before_label: string;
    after_label: string;
    description: string | null;
  }>;
  galleries: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
  }>;
}

async function getSubdomainData(
  subdomain: string
): Promise<SubdomainPageData | null> {
  try {
    const res = await fetch(`${API_URL}/subdomain/${subdomain}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const data = await getSubdomainData(subdomain);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">
            This subdomain doesn&apos;t exist
          </p>
        </div>
      </div>
    );
  }

  return <SubdomainPageClient data={data} />;
}
