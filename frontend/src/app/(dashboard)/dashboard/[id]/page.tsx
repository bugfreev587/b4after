"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import {
  ComparisonForm,
  ComparisonFormData,
  ProcessImageItem,
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
  process_images?: ProcessImageItem[];
}

interface User {
  plan: string;
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
  const api = useApiClient();
  const { getToken } = useAuth();
  const [comp, setComp] = useState<Comparison | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFormat, setVideoFormat] = useState("square");
  const [transformLoading, setTransformLoading] = useState(false);
  const [transformUrl, setTransformUrl] = useState<string | null>(null);
  const [transformFormat, setTransformFormat] = useState("square");
  const [processLoading, setProcessLoading] = useState(false);
  const [processUrl, setProcessUrl] = useState<string | null>(null);
  const [processFormat, setProcessFormat] = useState("square");
  const [multiProcessLoading, setMultiProcessLoading] = useState(false);
  const [multiProcessUrl, setMultiProcessUrl] = useState<string | null>(null);
  const [multiProcessFormat, setMultiProcessFormat] = useState("square");

  const fetchData = useCallback(async () => {
    try {
      const [c, a, u] = await Promise.all([
        api.fetch<Comparison>(`/comparisons/${id}`),
        api.fetch<AnalyticsSummary>(`/analytics/${id}`),
        api.fetch<User>("/users/me"),
      ]);
      setComp(c);
      setAnalytics(a);
      setUser(u);
    } catch {
      toast.error("Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [id, api]);

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

  const handleDownloadImage = async () => {
    setImageLoading(true);
    try {
      const token = await getToken();
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${API_URL}/comparisons/${id}/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to generate image");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${comp?.slug}-comparison.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    setVideoLoading(true);
    setVideoUrl(null);
    try {
      const result = await api.fetch<{ url: string }>(
        `/comparisons/${id}/video?format=${videoFormat}`,
        { method: "POST" }
      );
      setVideoUrl(result.url);
      toast.success("Video generated!");
    } catch {
      toast.error("Failed to generate video");
    } finally {
      setVideoLoading(false);
    }
  };

  const handleGenerateTransformVideo = async () => {
    setTransformLoading(true);
    setTransformUrl(null);
    try {
      const result = await api.fetch<{ url: string }>(
        `/comparisons/${id}/transform-video?format=${transformFormat}`,
        { method: "POST" }
      );
      setTransformUrl(result.url);
      toast.success("Transform video generated!");
    } catch {
      toast.error("Failed to generate transform video");
    } finally {
      setTransformLoading(false);
    }
  };

  const handleGenerateProcessVideo = async () => {
    setProcessLoading(true);
    setProcessUrl(null);
    try {
      const result = await api.fetch<{ url: string }>(
        `/comparisons/${id}/process-video?format=${processFormat}`,
        { method: "POST" }
      );
      setProcessUrl(result.url);
      toast.success("Process video generated!");
    } catch {
      toast.error("Failed to generate process video");
    } finally {
      setProcessLoading(false);
    }
  };

  const handleGenerateMultiProcessVideo = async () => {
    setMultiProcessLoading(true);
    setMultiProcessUrl(null);
    try {
      const result = await api.fetch<{ url: string }>(
        `/comparisons/${id}/multi-process-video?format=${multiProcessFormat}`,
        { method: "POST" }
      );
      setMultiProcessUrl(result.url);
      toast.success("Multi-photo process video generated!");
    } catch {
      toast.error("Failed to generate multi-photo process video");
    } finally {
      setMultiProcessLoading(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!comp) return <p>Comparison not found</p>;

  const isPro = user?.plan === "pro" || user?.plan === "business";
  const hasProcessImages = (comp.process_images?.length ?? 0) >= 3;

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
          <TabsTrigger value="export">Export</TabsTrigger>
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
          {comp.process_images && comp.process_images.length > 0 && (
            <div className="mt-6 max-w-2xl">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Process Photos
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {comp.process_images.map((pi, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-28"
                  >
                    <div className="aspect-square rounded-md overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pi.url}
                        alt={pi.label || `Step ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {pi.label && (
                      <p className="text-xs text-muted-foreground mt-1 text-center truncate">
                        {pi.label}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                  <CardTitle className="text-sm capitalize text-muted-foreground">
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
                <CardTitle className="text-sm text-muted-foreground">
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{comp.view_count}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export" className="mt-4 space-y-6 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Download Image</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Download a side-by-side comparison image (PNG)
              </p>
              <Button onClick={handleDownloadImage} disabled={imageLoading}>
                {imageLoading ? "Generating..." : "Download Image"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPro ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Generate a comparison video with wipe transition
                  </p>
                  <div className="flex gap-2 items-center">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={videoFormat}
                      onChange={(e) => setVideoFormat(e.target.value)}
                    >
                      <option value="square">Square (1080x1080)</option>
                      <option value="portrait">Portrait (1080x1920)</option>
                      <option value="landscape">Landscape (1920x1080)</option>
                    </select>
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={videoLoading}
                    >
                      {videoLoading ? "Generating..." : "Generate Video"}
                    </Button>
                  </div>
                  {videoUrl && (
                    <div className="mt-3">
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Download Video
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">
                    Video export requires a Pro or Business plan
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/billing")}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Transform Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPro ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Generate a crossfade transformation video
                  </p>
                  <div className="flex gap-2 items-center">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={transformFormat}
                      onChange={(e) => setTransformFormat(e.target.value)}
                    >
                      <option value="square">Square (1080x1080)</option>
                      <option value="portrait">Portrait (1080x1920)</option>
                      <option value="landscape">Landscape (1920x1080)</option>
                    </select>
                    <Button
                      onClick={handleGenerateTransformVideo}
                      disabled={transformLoading}
                    >
                      {transformLoading ? "Generating..." : "Generate Video"}
                    </Button>
                  </div>
                  {transformUrl && (
                    <div className="mt-3">
                      <a
                        href={transformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Download Transform Video
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">
                    Transform video requires a Pro or Business plan
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/billing")}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Process Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPro ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Generate a process video with title card transition
                  </p>
                  <div className="flex gap-2 items-center">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={processFormat}
                      onChange={(e) => setProcessFormat(e.target.value)}
                    >
                      <option value="square">Square (1080x1080)</option>
                      <option value="portrait">Portrait (1080x1920)</option>
                      <option value="landscape">Landscape (1920x1080)</option>
                    </select>
                    <Button
                      onClick={handleGenerateProcessVideo}
                      disabled={processLoading}
                    >
                      {processLoading ? "Generating..." : "Generate Video"}
                    </Button>
                  </div>
                  {processUrl && (
                    <div className="mt-3">
                      <a
                        href={processUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Download Process Video
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">
                    Process video requires a Pro or Business plan
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/dashboard/billing")}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {hasProcessImages && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Multi-Photo Process Video
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPro ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Generate a video from your {comp.process_images!.length}{" "}
                      process photos with crossfade transitions and labels
                    </p>
                    <div className="flex gap-2 items-center">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={multiProcessFormat}
                        onChange={(e) =>
                          setMultiProcessFormat(e.target.value)
                        }
                      >
                        <option value="square">Square (1080x1080)</option>
                        <option value="portrait">
                          Portrait (1080x1920)
                        </option>
                        <option value="landscape">
                          Landscape (1920x1080)
                        </option>
                      </select>
                      <Button
                        onClick={handleGenerateMultiProcessVideo}
                        disabled={multiProcessLoading}
                      >
                        {multiProcessLoading
                          ? "Generating..."
                          : "Generate Video"}
                      </Button>
                    </div>
                    {multiProcessUrl && (
                      <div className="mt-3">
                        <a
                          href={multiProcessUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-sm"
                        >
                          Download Multi-Photo Process Video
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      Multi-photo process video requires a Pro or Business plan
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/billing")}
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
