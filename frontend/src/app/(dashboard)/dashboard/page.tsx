"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

interface BenchmarkMetrics {
  total_comparisons: number;
  total_views: number;
  avg_views: number;
  avg_rating: number;
  total_reviews: number;
}

interface Achievement {
  id: string;
  type: string;
  achieved_at: string;
}

const ACHIEVEMENT_LABELS: Record<string, { label: string; icon: string }> = {
  first_comparison: { label: "First Comparison", icon: "🎯" },
  first_100_views: { label: "100 Views", icon: "👀" },
  five_star_pro: { label: "5-Star Pro", icon: "⭐" },
  top_10_percent: { label: "Top 10%", icon: "🏆" },
};

interface Space {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  is_public: boolean;
}

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
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    Promise.all([
      api.fetch<Space[]>("/spaces").catch(() => [] as Space[]),
      api.fetch<Comparison[]>("/comparisons").catch(() => [] as Comparison[]),
      api.fetch<{ metrics: BenchmarkMetrics }>("/benchmarks/me").catch(() => null),
      api.fetch<Achievement[]>("/achievements").catch(() => [] as Achievement[]),
    ])
      .then(([s, c, b, a]) => {
        setSpaces(s);
        setComparisons(c);
        if (b) setBenchmarks(b.metrics);
        setAchievements(a);
      })
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  // If no spaces, show CTA to create first space
  if (spaces.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">Welcome to B4After!</h2>
        <p className="text-muted-foreground mb-6">
          Create your first Space to start organizing comparisons
        </p>
        <Link href="/dashboard/spaces/new" className={buttonVariants()}>
          Create Your First Space
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Benchmark Cards */}
      {benchmarks && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Comparisons</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{benchmarks.total_comparisons}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{benchmarks.total_views.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Avg Views</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{Math.round(benchmarks.avg_views)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {benchmarks.avg_rating > 0 ? benchmarks.avg_rating.toFixed(1) : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => {
              const info = ACHIEVEMENT_LABELS[a.type] || { label: a.type, icon: "🏅" };
              return (
                <Badge key={a.id} variant="secondary" className="text-sm py-1 px-3">
                  {info.icon} {info.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Spaces overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My Spaces</h2>
          <Link
            href="/dashboard/spaces"
            className="text-sm text-muted-foreground hover:text-white"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.slice(0, 3).map((space) => (
            <Link key={space.id} href={`/dashboard/spaces/${space.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">
                      {space.name}
                    </CardTitle>
                    <Badge
                      variant={space.is_public ? "default" : "secondary"}
                    >
                      {space.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground capitalize">
                    {space.category}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent comparisons */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Comparisons</h2>
        {comparisons.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No comparisons yet. Add one from a space!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisons.slice(0, 6).map((comp) => (
              <Link key={comp.id} href={`/dashboard/${comp.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm truncate">
                        {comp.title}
                      </CardTitle>
                      <Badge
                        variant={comp.is_published ? "default" : "secondary"}
                      >
                        {comp.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 mb-2">
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{comp.category}</span>
                      <span>{comp.view_count} views</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
