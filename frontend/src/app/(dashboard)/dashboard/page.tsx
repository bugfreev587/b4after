"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useApiClient } from "@/lib/api";
import { useTenant } from "@/lib/tenant-context";
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

interface LeadStats {
  total: number;
  new: number;
}

interface ReviewStats {
  total: number;
  new: number;
  avg_rating: number;
}

interface UploadRequest {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { tenant, plan } = useTenant();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkMetrics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [pendingUploads, setPendingUploads] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    Promise.all([
      api.fetch<Comparison[]>("/comparisons").catch(() => [] as Comparison[]),
      api.fetch<{ metrics: BenchmarkMetrics }>("/benchmarks/me").catch(() => null),
      api.fetch<Achievement[]>("/achievements").catch(() => [] as Achievement[]),
      api.fetch<LeadStats>("/leads/stats").catch(() => null),
      api.fetch<ReviewStats>("/reviews/stats").catch(() => null),
      api.fetch<UploadRequest[]>("/upload-requests").catch(() => [] as UploadRequest[]),
    ])
      .then(([c, b, a, ls, rs, ur]) => {
        setComparisons(c);
        if (b) setBenchmarks(b.metrics);
        setAchievements(a);
        if (ls) setLeadStats(ls);
        if (rs) setReviewStats(rs);
        setPendingUploads(ur.filter((u) => u.status === "pending"));
      })
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  // Empty state for brand new users
  if (!benchmarks || benchmarks.total_comparisons === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">
          Welcome to B4After{user?.firstName ? `, ${user.firstName}` : ""}!
        </h2>
        <p className="text-muted-foreground mb-6">
          Create your first Space to start organizing comparisons
        </p>
        <Link href="/dashboard/spaces/new" className={buttonVariants()}>
          Create Your First Space
        </Link>
      </div>
    );
  }

  const planBadgeColor =
    plan === "business"
      ? "bg-amber-500/20 text-amber-400"
      : plan === "pro"
        ? "bg-purple-500/20 text-purple-400"
        : "bg-white/10 text-gray-400";

  return (
    <div>
      {/* Welcome section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <Badge
            variant="secondary"
            className={`text-[10px] capitalize ${planBadgeColor}`}
          >
            {plan}
          </Badge>
        </div>
        {tenant && (
          <p className="text-sm text-muted-foreground">{tenant.name}</p>
        )}
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            href="/dashboard/new"
            className={buttonVariants({ size: "sm" })}
          >
            + New Comparison
          </Link>
          <Link
            href="/dashboard/upload-requests/new"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Request Client Photos
          </Link>
          <Link
            href="/dashboard/spaces"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View Gallery
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              Total Comparisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {benchmarks.total_comparisons}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {benchmarks.total_views.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leadStats?.new ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              New Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reviewStats?.new ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Achievements</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => {
              const info = ACHIEVEMENT_LABELS[a.type] || {
                label: a.type,
                icon: "🏅",
              };
              return (
                <Badge
                  key={a.id}
                  variant="secondary"
                  className="text-sm py-1 px-3"
                >
                  {info.icon} {info.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Two-column: Recent Activity + Action Required */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Recent Comparisons (60%) */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold mb-4">Recent Comparisons</h2>
          {comparisons.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No comparisons yet. Add one from a space!
            </p>
          ) : (
            <div className="space-y-2">
              {comparisons.slice(0, 8).map((comp) => (
                <Link key={comp.id} href={`/dashboard/${comp.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition group">
                    <div className="flex gap-1.5 shrink-0">
                      <img
                        src={comp.before_image_url}
                        alt="Before"
                        className="rounded w-10 h-10 object-cover"
                      />
                      <img
                        src={comp.after_image_url}
                        alt="After"
                        className="rounded w-10 h-10 object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate group-hover:text-white">
                        {comp.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {comp.view_count} views &middot;{" "}
                        {new Date(comp.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={comp.is_published ? "default" : "secondary"}
                      className="shrink-0 text-[10px]"
                    >
                      {comp.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Action Required (40%) */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Action Required</h2>
          <div className="space-y-3">
            {/* Pending uploads */}
            {pendingUploads.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Pending Uploads ({pendingUploads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {pendingUploads.slice(0, 3).map((ur) => (
                    <Link
                      key={ur.id}
                      href="/dashboard/upload-requests"
                      className="block text-sm text-muted-foreground hover:text-white transition"
                    >
                      {ur.client_name} &mdash;{" "}
                      {new Date(ur.created_at).toLocaleDateString()}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* New reviews */}
            {(reviewStats?.new ?? 0) > 0 && (
              <Link href="/dashboard/reviews">
                <Card className="hover:bg-white/5 transition cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      New Reviews ({reviewStats!.new})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Avg rating: {reviewStats!.avg_rating > 0 ? reviewStats!.avg_rating.toFixed(1) : "—"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* New leads */}
            {(leadStats?.new ?? 0) > 0 && (
              <Link href="/dashboard/leads">
                <Card className="hover:bg-white/5 transition cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      New Leads ({leadStats!.new})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Click to view and follow up
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* No actions needed */}
            {pendingUploads.length === 0 &&
              (reviewStats?.new ?? 0) === 0 &&
              (leadStats?.new ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All caught up! No actions needed.
                </p>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
