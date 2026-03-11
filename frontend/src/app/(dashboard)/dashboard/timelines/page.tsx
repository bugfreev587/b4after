"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface Timeline {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  is_public: boolean;
  created_at: string;
}

export default function TimelinesPage() {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    api
      .fetch<Timeline[]>("/timelines")
      .then(setTimelines)
      .catch((err) => console.error("Failed to load timelines:", err))
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading timelines...</p>;
  }

  if (timelines.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">No timelines yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first timeline to showcase progress over time
        </p>
        <Link href="/dashboard/timelines/new" className={buttonVariants()}>
          Create Timeline
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Timelines</h1>
        <Link href="/dashboard/timelines/new" className={buttonVariants()}>
          Create Timeline
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {timelines.map((timeline) => (
          <Link
            key={timeline.id}
            href={`/dashboard/timelines/${timeline.id}`}
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">
                    {timeline.title}
                  </CardTitle>
                  <Badge
                    variant={timeline.is_public ? "default" : "secondary"}
                  >
                    {timeline.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {timeline.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {timeline.description}
                  </p>
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {timeline.category}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
