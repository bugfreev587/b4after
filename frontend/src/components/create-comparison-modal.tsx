"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CreateComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateComparisonModal({
  open,
  onOpenChange,
  onCreated,
}: CreateComparisonModalProps) {
  const api = useApiClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    cta_text: "",
    before_image_url: "",
    after_image_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.before_image_url || !form.after_image_url) {
      toast.error("Please upload both before and after images");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    setCreating(true);
    try {
      await api.fetch("/comparisons", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          cta_text: form.cta_text,
          before_image_url: form.before_image_url,
          after_image_url: form.after_image_url,
        }),
      });
      toast.success("Comparison created! Drag it to a space to publish.");
      setForm({
        title: "",
        description: "",
        category: "",
        cta_text: "",
        before_image_url: "",
        after_image_url: "",
      });
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create comparison",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80%] max-w-[900px] sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Comparison</DialogTitle>
          <DialogDescription>
            Upload before and after photos. The new comparison will appear in
            your library — drag it to a space when ready.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ImageUpload
                label="Before Photo"
                value={form.before_image_url}
                onChange={(url) =>
                  setForm((f) => ({ ...f, before_image_url: url }))
                }
              />
              <ImageUpload
                label="After Photo"
                value={form.after_image_url}
                onChange={(url) =>
                  setForm((f) => ({ ...f, after_image_url: url }))
                }
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g., Smile Makeover - Sarah"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Describe the transformation..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Category (optional)</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="e.g., Dental, Hair, Skin"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Text (optional)</Label>
                <Input
                  value={form.cta_text}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cta_text: e.target.value }))
                  }
                  placeholder="e.g., Book a Consultation"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Comparison"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
