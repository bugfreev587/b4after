"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ComparisonForm,
  ComparisonFormData,
} from "@/components/comparison-form";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Comparison extends ComparisonFormData {
  id: string;
  slug: string;
  view_count: number;
}

interface AnalyticsSummary {
  event_counts: { event_type: string; count: number }[];
  daily_views: { date: string; count: number }[];
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function ComparisonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [comp, setComp] = useState<Comparison | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api.fetch<Comparison>(`/comparisons/${id}`),
        api.fetch<AnalyticsSummary>(`/analytics/${id}`),
      ]);
      setComp(c);
      setAnalytics(a);
    } catch {
      toast.error("Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async (data: ComparisonFormData) => {
    try {
      await api.fetch(`/comparisons/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Comparison updated!");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update comparison",
      );
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comparison?")) return;
    try {
      await api.fetch(`/comparisons/${id}`, { method: "DELETE" });
      toast.success("Comparison deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!comp) return <p>Comparison not found</p>;

  const publicURL = `${APP_URL}/s/${comp.slug}`;
  const embedCode = `<iframe src="${APP_URL}/embed/${comp.slug}" width="100%" height="500" frameborder="0"></iframe>`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{comp.title}</h1>
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <div className="max-w-2xl">
            <BeforeAfterSlider
              beforeImage={comp.before_image_url}
              afterImage={comp.after_image_url}
              beforeLabel={comp.before_label}
              afterLabel={comp.after_label}
            />
          </div>
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <ComparisonForm
            initial={comp}
            onSubmit={handleUpdate}
            submitLabel="Update Comparison"
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {analytics?.event_counts.map((ec) => (
              <Card key={ec.event_type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize text-gray-500">
                    {ec.event_type.replace("_", " ")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{ec.count}</p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{comp.view_count}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="share" className="mt-4 space-y-4 max-w-xl">
          <div className="space-y-2">
            <label className="text-sm font-medium">Public URL</label>
            <div className="flex gap-2">
              <Input value={publicURL} readOnly />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(publicURL);
                  toast.success("URL copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Embed Code</label>
            <div className="flex gap-2">
              <Input value={embedCode} readOnly />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(embedCode);
                  toast.success("Embed code copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
