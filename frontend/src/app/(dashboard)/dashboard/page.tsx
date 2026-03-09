"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface Comparison {
  id: string;
  title: string;
  slug: string;
  category: string;
  before_image_url: string;
  after_image_url: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

export default function DashboardPage() {
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    api
      .fetch<Comparison[]>("/comparisons")
      .then(setComparisons)
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading comparisons...</p>;
  }

  if (comparisons.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">No comparisons yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first before & after comparison
        </p>
        <Link href="/dashboard/new" className={buttonVariants()}>
          Create Comparison
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Comparisons</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {comparisons.map((comp) => (
          <Link key={comp.id} href={`/dashboard/${comp.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">
                    {comp.title}
                  </CardTitle>
                  <Badge variant={comp.is_published ? "default" : "secondary"}>
                    {comp.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <img
                    src={comp.before_image_url}
                    alt="Before"
                    className="rounded aspect-square object-cover w-full"
                  />
                  <img
                    src={comp.after_image_url}
                    alt="After"
                    className="rounded aspect-square object-cover w-full"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="capitalize">{comp.category}</span>
                  <span>{comp.view_count} views</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
