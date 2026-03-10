"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface Space {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
}

export default function SpacesPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    api
      .fetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch((err) => console.error("Failed to load spaces:", err))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading spaces...</p>;
  }

  if (spaces.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">No spaces yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first space to organize comparisons
        </p>
        <Link href="/dashboard/spaces/new" className={buttonVariants()}>
          Create Space
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Spaces</h1>
        <Link href="/dashboard/spaces/new" className={buttonVariants()}>
          Create Space
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <Link key={space.id} href={`/dashboard/spaces/${space.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">
                    {space.name}
                  </CardTitle>
                  <Badge variant={space.is_public ? "default" : "secondary"}>
                    {space.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {space.cover_image_url && (
                  <img
                    src={space.cover_image_url}
                    alt={space.name}
                    className="rounded aspect-video object-cover w-full mb-3"
                  />
                )}
                {space.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {space.description}
                  </p>
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {space.category}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
