"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { toast } from "sonner";

interface Comparison {
  id: string;
  title: string;
  slug: string;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
  is_published: boolean;
}

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_published: boolean;
  comparisons: Comparison[];
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApiClient();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [allComparisons, setAllComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [g, comps] = await Promise.all([
        api.fetch<Gallery>(`/galleries/${id}`),
        api.fetch<Comparison[]>("/comparisons"),
      ]);
      setGallery(g);
      setAllComparisons(comps);
      setTitle(g.title);
      setDescription(g.description || "");
      setIsPublished(g.is_published);
    } catch {
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  }, [id, api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = async () => {
    try {
      await api.fetch(`/galleries/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          is_published: isPublished,
        }),
      });
      toast.success("Gallery updated!");
      fetchData();
    } catch {
      toast.error("Failed to update gallery");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this gallery?")) return;
    try {
      await api.fetch(`/galleries/${id}`, { method: "DELETE" });
      toast.success("Gallery deleted");
      router.push("/dashboard/galleries");
    } catch {
      toast.error("Failed to delete gallery");
    }
  };

  const handleAddComparison = async () => {
    if (!selectedCompId) return;
    try {
      await api.fetch(`/galleries/${id}/comparisons`, {
        method: "POST",
        body: JSON.stringify({
          comparison_id: selectedCompId,
          sort_order: gallery?.comparisons?.length || 0,
        }),
      });
      toast.success("Comparison added!");
      setSelectedCompId("");
      fetchData();
    } catch {
      toast.error("Failed to add comparison");
    }
  };

  const handleRemoveComparison = async (compId: string) => {
    try {
      await api.fetch(`/galleries/${id}/comparisons/${compId}`, {
        method: "DELETE",
      });
      toast.success("Comparison removed");
      fetchData();
    } catch {
      toast.error("Failed to remove comparison");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!gallery) return <p>Gallery not found</p>;

  const galleryCompIds = new Set(gallery.comparisons?.map((c) => c.id) || []);
  const availableComparisons = allComparisons.filter(
    (c) => !galleryCompIds.has(c.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{gallery.title}</h1>
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <Tabs defaultValue="comparisons">
        <TabsList>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="comparisons" className="mt-4 space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label>Add Comparison</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={selectedCompId}
                onChange={(e) => setSelectedCompId(e.target.value)}
              >
                <option value="">Select a comparison...</option>
                {availableComparisons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleAddComparison} disabled={!selectedCompId}>
              Add
            </Button>
          </div>

          {gallery.comparisons?.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No comparisons in this gallery yet
            </p>
          ) : (
            <div className="space-y-3">
              {gallery.comparisons?.map((comp) => (
                <Card key={comp.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={comp.before_image_url}
                        alt=""
                        className="w-12 h-12 rounded object-cover"
                      />
                      <span className="font-medium">{comp.title}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveComparison(comp.id)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-4 max-w-xl space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Published</span>
          </label>
          <div className="flex gap-2">
            <Button onClick={handleUpdate}>Save Changes</Button>
            {gallery.is_published && (
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${APP_URL}/g/${gallery.slug}`
                  );
                  toast.success("URL copied!");
                }}
              >
                Copy Public URL
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {gallery.comparisons?.length === 0 ? (
            <p className="text-muted-foreground">
              Add comparisons to see a preview
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gallery.comparisons?.map((comp) => (
                <div key={comp.id}>
                  <h3 className="font-medium mb-2">{comp.title}</h3>
                  <BeforeAfterSlider
                    beforeImage={comp.before_image_url}
                    afterImage={comp.after_image_url}
                    beforeLabel={comp.before_label}
                    afterLabel={comp.after_label}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
