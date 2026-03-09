"use client";

import { useState } from "react";
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
import { ImageUpload } from "./image-upload";
import { BeforeAfterSlider } from "./before-after-slider";

export interface ComparisonFormData {
  title: string;
  description: string;
  category: string;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
  cta_text: string;
  cta_url: string;
  is_published: boolean;
}

interface ComparisonFormProps {
  initial?: Partial<ComparisonFormData>;
  onSubmit: (data: ComparisonFormData) => Promise<void>;
  submitLabel?: string;
}

const CATEGORIES = [
  { value: "beauty", label: "Beauty" },
  { value: "fitness", label: "Fitness" },
  { value: "dental", label: "Dental" },
  { value: "renovation", label: "Renovation" },
  { value: "other", label: "Other" },
];

export function ComparisonForm({
  initial,
  onSubmit,
  submitLabel = "Create",
}: ComparisonFormProps) {
  const [data, setData] = useState<ComparisonFormData>({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || "other",
    before_image_url: initial?.before_image_url || "",
    after_image_url: initial?.after_image_url || "",
    before_label: initial?.before_label || "Before",
    after_label: initial?.after_label || "After",
    cta_text: initial?.cta_text || "",
    cta_url: initial?.cta_url || "",
    is_published: initial?.is_published || false,
  });
  const [loading, setLoading] = useState(false);

  const update = (fields: Partial<ComparisonFormData>) =>
    setData((prev) => ({ ...prev, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => update({ title: e.target.value })}
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
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={data.category}
              onValueChange={(v) => { if (v) update({ category: v }); }}
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
            <ImageUpload
              label="Before Image"
              value={data.before_image_url}
              onChange={(url) => update({ before_image_url: url })}
            />
            <ImageUpload
              label="After Image"
              value={data.after_image_url}
              onChange={(url) => update({ after_image_url: url })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="beforeLabel">Before Label</Label>
              <Input
                id="beforeLabel"
                value={data.before_label}
                onChange={(e) => update({ before_label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afterLabel">After Label</Label>
              <Input
                id="afterLabel"
                value={data.after_label}
                onChange={(e) => update({ after_label: e.target.value })}
              />
            </div>
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
              id="published"
              checked={data.is_published}
              onChange={(e) => update({ is_published: e.target.checked })}
            />
            <Label htmlFor="published">Published</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : submitLabel}
          </Button>
        </div>

        {/* Right column: live preview */}
        <div>
          <Label>Preview</Label>
          {data.before_image_url && data.after_image_url ? (
            <BeforeAfterSlider
              beforeImage={data.before_image_url}
              afterImage={data.after_image_url}
              beforeLabel={data.before_label}
              afterLabel={data.after_label}
              className="mt-2"
            />
          ) : (
            <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center text-gray-400">
              Upload both images to see preview
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
