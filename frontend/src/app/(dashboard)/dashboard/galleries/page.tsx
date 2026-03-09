"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

export default function GalleriesPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    api
      .fetch<Gallery[]>("/galleries")
      .then(setGalleries)
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading galleries...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Galleries</h1>
        <Link
          href="/dashboard/galleries/new"
          className={buttonVariants({ size: "sm" })}
        >
          New Gallery
        </Link>
      </div>

      {galleries.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-2">No galleries yet</h2>
          <p className="text-muted-foreground mb-6">
            Group your comparisons into gallery pages
          </p>
          <Link href="/dashboard/galleries/new" className={buttonVariants()}>
            Create Gallery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => (
            <Link
              key={gallery.id}
              href={`/dashboard/galleries/${gallery.id}`}
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg truncate">
                      {gallery.title}
                    </CardTitle>
                    <Badge
                      variant={gallery.is_published ? "default" : "secondary"}
                    >
                      {gallery.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {gallery.description || "No description"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
