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

export interface ProcessImageItem {
  url: string;
  label: string;
}

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
  process_images?: ProcessImageItem[];
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
    process_images: initial?.process_images || [],
  });
  const [loading, setLoading] = useState(false);
  const [processOpen, setProcessOpen] = useState(
    (initial?.process_images?.length ?? 0) > 0
  );

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

  const processImages = data.process_images || [];

  const updateProcessImage = (
    index: number,
    fields: Partial<ProcessImageItem>
  ) => {
    const updated = [...processImages];
    updated[index] = { ...updated[index], ...fields };
    update({ process_images: updated });
  };

  const addProcessImage = () => {
    if (processImages.length >= 10) return;
    update({ process_images: [...processImages, { url: "", label: "" }] });
  };

  const removeProcessImage = (index: number) => {
    update({
      process_images: processImages.filter((_, i) => i !== index),
    });
  };

  const moveProcessImage = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= processImages.length) return;
    const updated = [...processImages];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    update({ process_images: updated });
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

          {/* Process Photos Section */}
          <div className="border border-white/10 rounded-lg">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left"
              onClick={() => setProcessOpen(!processOpen)}
            >
              <span className="font-medium">Process Photos (Optional)</span>
              <span className="text-muted-foreground text-sm">
                {processOpen ? "−" : "+"}
              </span>
            </button>
            {processOpen && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add 3-10 ordered photos to create a multi-step process video
                  (e.g., weekly progress, step-by-step).
                </p>
                {processImages.map((pi, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 border border-white/5 rounded-md p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={idx === 0}
                        onClick={() => moveProcessImage(idx, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        disabled={idx === processImages.length - 1}
                        onClick={() => moveProcessImage(idx, 1)}
                      >
                        ↓
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <ImageUpload
                        label={`Photo ${idx + 1}`}
                        value={pi.url}
                        onChange={(url) =>
                          updateProcessImage(idx, { url })
                        }
                      />
                      <Input
                        placeholder={`Label (e.g., "Week ${idx + 1}")`}
                        value={pi.label}
                        onChange={(e) =>
                          updateProcessImage(idx, {
                            label: e.target.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-8"
                      onClick={() => removeProcessImage(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {processImages.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProcessImage}
                  >
                    + Add Photo
                  </Button>
                )}
              </div>
            )}
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
            <div className="mt-2 border-2 border-dashed border-white/10 rounded-lg p-8 text-center text-muted-foreground">
              Upload both images to see preview
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
