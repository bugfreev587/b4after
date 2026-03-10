"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Space {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  services: string[] | null;
  cta_text: string | null;
  cta_url: string | null;
  cta_type: string;
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
  source: string;
}

interface UploadRequest {
  id: string;
  token: string;
  upload_url: string;
  client_name: string | null;
  client_email: string | null;
  request_type: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "secondary",
  opened: "outline",
  submitted: "default",
  approved: "default",
  rejected: "destructive",
  expired: "secondary",
};

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const spaceId = params.id as string;

  const [space, setSpace] = useState<Space | null>(null);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [requests, setRequests] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        api.fetch<Space>(`/spaces/${spaceId}`),
        api.fetch<UploadRequest[]>(`/spaces/${spaceId}/requests`),
      ]);
      setSpace(s);
      setRequests(r);
      // Load comparisons for this space
      const allComps = await api.fetch<Comparison[]>("/comparisons");
      setComparisons(allComps.filter((c) => c.source !== undefined));
    } catch (err) {
      console.error("Failed to load space:", err);
    } finally {
      setLoading(false);
    }
  }, [api, spaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!space) return <p className="text-muted-foreground">Space not found</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{space.name}</h1>
          {space.description && (
            <p className="text-muted-foreground mt-1">{space.description}</p>
          )}
        </div>
        <Badge variant={space.is_public ? "default" : "secondary"}>
          {space.is_public ? "Public" : "Private"}
        </Badge>
      </div>

      <Tabs defaultValue="comparisons">
        <TabsList>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="requests">Upload Requests</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
        </TabsList>

        <TabsContent value="comparisons" className="mt-6">
          <ComparisonsTab
            spaceId={spaceId}
            comparisons={comparisons}
          />
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          <RequestsTab
            spaceId={spaceId}
            requests={requests}
            onRefresh={loadData}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab space={space} onUpdate={loadData} onDelete={() => router.push("/dashboard/spaces")} />
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <ShareTab space={space} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComparisonsTab({
  spaceId,
  comparisons,
}: {
  spaceId: string;
  comparisons: Comparison[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Comparisons</h2>
        <Link
          href={`/dashboard/new?space=${spaceId}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Comparison
        </Link>
      </div>
      {comparisons.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No comparisons yet. Add your first one!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comparisons.map((comp) => (
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
                  <div className="grid grid-cols-2 gap-2">
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
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{comp.view_count} views</span>
                    {comp.source === "client" && (
                      <Badge variant="outline" className="text-xs">Client</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestsTab({
  spaceId,
  requests,
  onRefresh,
}: {
  spaceId: string;
  requests: UploadRequest[];
  onRefresh: () => void;
}) {
  const api = useApiClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    request_type: "both",
    instruction_note: "",
    service_type: "",
    sent_via: "manual_link",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.fetch(`/spaces/${spaceId}/requests`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Upload request created!");
      setForm({
        client_name: "",
        client_email: "",
        request_type: "both",
        instruction_note: "",
        service_type: "",
        sent_via: "manual_link",
      });
      onRefresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create request",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (
    id: string,
    action: "approve" | "reject" | "remind",
  ) => {
    try {
      await api.fetch(`/requests/${id}/${action}`, { method: "POST" });
      toast.success(
        action === "approve"
          ? "Approved! Comparison created."
          : action === "reject"
            ? "Rejected."
            : "Reminder sent!",
      );
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Upload Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_name: e.target.value }))
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Client Email</Label>
                <Input
                  value={form.client_email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, client_email: e.target.value }))
                  }
                  placeholder="jane@example.com"
                  type="email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select
                  value={form.request_type}
                  onValueChange={(v) => {
                    if (v) setForm((f) => ({ ...f, request_type: v }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Photos</SelectItem>
                    <SelectItem value="before_only">Before Only</SelectItem>
                    <SelectItem value="after_only">After Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send Via</Label>
                <Select
                  value={form.sent_via}
                  onValueChange={(v) => {
                    if (v) setForm((f) => ({ ...f, sent_via: v }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_link">Manual Link</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instructions (optional)</Label>
              <Textarea
                value={form.instruction_note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instruction_note: e.target.value }))
                }
                placeholder="e.g., Please upload a clear photo of the area..."
                rows={2}
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Upload Requests</h3>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No upload requests yet.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {req.client_name || "Anonymous"}
                        {req.client_email && (
                          <span className="text-muted-foreground ml-2 text-sm">
                            ({req.client_email})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.request_type} &middot; Expires{" "}
                        {new Date(req.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_COLORS[req.status] || "secondary"}>
                        {req.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(req.upload_url)}
                      >
                        Copy Link
                      </Button>
                      {(req.status === "sent" || req.status === "opened") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(req.id, "remind")}
                        >
                          Remind
                        </Button>
                      )}
                      {req.status === "submitted" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAction(req.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleAction(req.id, "reject")}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
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
  space,
  onUpdate,
  onDelete,
}: {
  space: Space;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const api = useApiClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [data, setData] = useState({
    name: space.name,
    description: space.description || "",
    category: space.category,
    is_public: space.is_public,
    cta_text: space.cta_text || "",
    cta_url: space.cta_url || "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.fetch(`/spaces/${space.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Space updated!");
      onUpdate();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update space",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this space? All comparisons in it will be unlinked."))
      return;
    setDeleting(true);
    try {
      await api.fetch(`/spaces/${space.id}`, { method: "DELETE" });
      toast.success("Space deleted!");
      onDelete();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete space",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input
          value={data.name}
          onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
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
          {deleting ? "Deleting..." : "Delete Space"}
        </Button>
      </div>
    </form>
  );
}

function ShareTab({ space }: { space: Space }) {
  const publicURL =
    typeof window !== "undefined"
      ? `${window.location.origin}/w/${space.slug}`
      : `/w/${space.slug}`;
  const embedCode = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/w/${space.slug}" width="100%" height="600" frameborder="0"></iframe>`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Public Wall URL</Label>
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
      <div className="space-y-2">
        <Label>Embed Code</Label>
        <div className="flex gap-2">
          <Textarea value={embedCode} readOnly rows={3} />
          <Button
            type="button"
            variant="outline"
            onClick={() => copy(embedCode)}
          >
            Copy
          </Button>
        </div>
      </div>
    </div>
  );
}
