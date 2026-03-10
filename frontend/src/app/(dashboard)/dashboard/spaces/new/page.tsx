"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "beauty", label: "Beauty" },
  { value: "fitness", label: "Fitness" },
  { value: "dental", label: "Dental" },
  { value: "renovation", label: "Renovation" },
  { value: "other", label: "Other" },
];

export default function NewSpacePage() {
  const router = useRouter();
  const api = useApiClient();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    name: "",
    description: "",
    category: "other",
    cover_image_url: "",
    services: [] as string[],
    cta_text: "",
    cta_url: "",
    cta_type: "none",
    is_public: true,
  });
  const [serviceInput, setServiceInput] = useState("");

  const update = (fields: Partial<typeof data>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const addService = () => {
    const val = serviceInput.trim();
    if (val && !data.services.includes(val)) {
      update({ services: [...data.services, val] });
      setServiceInput("");
    }
  };

  const removeService = (idx: number) => {
    update({ services: data.services.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.fetch<{ id: string }>("/spaces", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Space created!");
      router.push(`/dashboard/spaces/${result.id}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create space",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Space</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g., Hair Transformations"
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
            placeholder="Describe what this space is about..."
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

        <ImageUpload
          label="Cover Image"
          value={data.cover_image_url}
          onChange={(url) => update({ cover_image_url: url })}
        />

        <div className="space-y-2">
          <Label>Services</Label>
          <div className="flex gap-2">
            <Input
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              placeholder="Add a service (e.g., Haircut)"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addService();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addService}>
              Add
            </Button>
          </div>
          {data.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.services.map((svc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm"
                >
                  {svc}
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="text-muted-foreground hover:text-white"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
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
          <Label htmlFor="isPublic">Public (visible on space wall)</Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Space"}
        </Button>
      </form>
    </div>
  );
}
