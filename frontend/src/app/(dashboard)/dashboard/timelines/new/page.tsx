"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "beauty", label: "Beauty" },
  { value: "fitness", label: "Fitness" },
  { value: "dental", label: "Dental" },
  { value: "renovation", label: "Renovation" },
  { value: "other", label: "Other" },
];

export default function NewTimelinePage() {
  const router = useRouter();
  const api = useApiClient();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    title: "",
    description: "",
    category: "other",
    cta_text: "",
    cta_url: "",
    is_public: true,
  });

  const update = (fields: Partial<typeof data>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.fetch<{ id: string }>("/timelines", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Timeline created!");
      router.push(`/dashboard/timelines/${result.id}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create timeline",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Timeline</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Timeline Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={data.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="e.g., My Fitness Journey"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={3}
                placeholder="Describe what this timeline is about..."
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={data.category}
                onValueChange={(v) => {
                  if (v) update({ category: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text</Label>
                <Input
                  id="ctaText"
                  value={data.cta_text}
                  onChange={(e) => update({ cta_text: e.target.value })}
                  placeholder="Book Now"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaUrl">CTA URL</Label>
                <Input
                  id="ctaUrl"
                  value={data.cta_url}
                  onChange={(e) => update({ cta_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={data.is_public}
                onChange={(e) => update({ is_public: e.target.checked })}
              />
              <Label htmlFor="isPublic">Public (visible to anyone with the link)</Label>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Timeline"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
