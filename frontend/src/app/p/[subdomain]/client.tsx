"use client";

import Link from "next/link";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function SubdomainPageClient({ data }: { data: SubdomainPageData }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#1A1425] border-b border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-white">
            {data.user.name || "Portfolio"}
          </h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {data.comparisons.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Comparisons</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.comparisons.map((comp) => (
                <Card key={comp.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <Link
                        href={`${APP_URL}/s/${comp.slug}`}
                        className="hover:underline"
                      >
                        {comp.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BeforeAfterSlider
                      beforeImage={comp.before_image_url}
                      afterImage={comp.after_image_url}
                      beforeLabel={comp.before_label}
                      afterLabel={comp.after_label}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {data.galleries.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-6">Galleries</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.galleries.map((gallery) => (
                <Card key={gallery.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      <Link
                        href={`${APP_URL}/g/${gallery.slug}`}
                        className="hover:underline"
                      >
                        {gallery.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  {gallery.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {gallery.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {data.comparisons.length === 0 && data.galleries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No published content yet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
