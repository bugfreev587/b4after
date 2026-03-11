"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface TimelineEntry {
  id: string;
  image_url: string;
  label: string;
  date: string;
  note: string | null;
  sort_order: number;
}

interface Timeline {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  cta_text: string | null;
  cta_url: string | null;
  is_public: boolean;
  entries: TimelineEntry[];
}

export default function TimelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const timelineId = params.id as string;

  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const t = await api.fetch<Timeline>(`/timelines/${timelineId}`);
      setTimeline(t);
    } catch (err) {
      console.error("Failed to load timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [api, timelineId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!timeline) return <p className="text-muted-foreground">Timeline not found</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{timeline.title}</h1>
          {timeline.description && (
            <p className="text-muted-foreground mt-1">{timeline.description}</p>
          )}
        </div>
        <Badge variant={timeline.is_public ? "default" : "secondary"}>
          {timeline.is_public ? "Public" : "Private"}
        </Badge>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-6">
          <EntriesTab
            timelineId={timelineId}
            entries={timeline.entries || []}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            timeline={timeline}
            onUpdate={loadData}
            onDelete={() => router.push("/dashboard/timelines")}
          />
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <ShareTab slug={timeline.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EntriesTab({
  timelineId,
  entries,
  onRefresh,
}: {
  timelineId: string;
  entries: TimelineEntry[];
  onRefresh: () => void;
}) {
  const api = useApiClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    image_url: "",
    label: "",
    date: "",
    note: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.fetch(`/timelines/${timelineId}/entries`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Entry added!");
      setForm({ image_url: "", label: "", date: "", note: "" });
      onRefresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add entry",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await api.fetch(`/timelines/${timelineId}/entries/${entryId}`, {
        method: "DELETE",
      });
      toast.success("Entry deleted!");
      onRefresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete entry",
      );
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Add Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                  placeholder="e.g., Week 1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={form.image_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, image_url: e.target.value }))
                }
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={2}
                placeholder="Any additional notes..."
              />
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding..." : "Add Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Entries ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No entries yet. Add your first one above!
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {entry.image_url && (
                      <img
                        src={entry.image_url}
                        alt={entry.label}
                        className="w-16 h-16 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      {entry.note && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {entry.note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({
  timeline,
  onUpdate,
  onDelete,
}: {
  timeline: Timeline;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const api = useApiClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState({
    title: timeline.title,
    description: timeline.description || "",
    category: timeline.category,
    cta_text: timeline.cta_text || "",
    cta_url: timeline.cta_url || "",
    is_public: timeline.is_public,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.fetch(`/timelines/${timeline.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Timeline updated!");
      onUpdate();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update timeline",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this timeline? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.fetch(`/timelines/${timeline.id}`, { method: "DELETE" });
      toast.success("Timeline deleted!");
      onDelete();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete timeline",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={data.title}
          onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={data.description}
          onChange={(e) =>
            setData((d) => ({ ...d, description: e.target.value }))
          }
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CTA Text</Label>
          <Input
            value={data.cta_text}
            onChange={(e) =>
              setData((d) => ({ ...d, cta_text: e.target.value }))
            }
            placeholder="Book Now"
          />
        </div>
        <div className="space-y-2">
          <Label>CTA URL</Label>
          <Input
            value={data.cta_url}
            onChange={(e) =>
              setData((d) => ({ ...d, cta_url: e.target.value }))
            }
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="settingsPublic"
          checked={data.is_public}
          onChange={(e) =>
            setData((d) => ({ ...d, is_public: e.target.checked }))
          }
        />
        <Label htmlFor="settingsPublic">Public</Label>
      </div>
      <Separator />
      <div className="flex gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting..." : "Delete Timeline"}
        </Button>
      </div>
    </form>
  );
}

function ShareTab({ slug }: { slug: string }) {
  const publicURL =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${slug}`
      : `/t/${slug}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Public Timeline URL</Label>
        <div className="flex gap-2">
          <Input value={publicURL} readOnly />
          <Button
            type="button"
            variant="outline"
            onClick={() => copy(publicURL)}
          >
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
