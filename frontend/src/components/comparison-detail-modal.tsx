"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Comparison {
  id: string;
  title: string;
  slug: string;
  category: string;
  description?: string;
  before_image_url: string;
  after_image_url: string;
  is_published: boolean;
  view_count: number;
  source: string;
  space_id?: string | null;
}

interface ComparisonDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comparison: Comparison | null;
  onUpdated: () => void;
}

export function ComparisonDetailModal({
  open,
  onOpenChange,
  comparison,
  onUpdated,
}: ComparisonDetailModalProps) {
  const api = useApiClient();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!comparison) return null;

  const publicURL =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${comparison.slug}`
      : `/c/${comparison.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicURL);
    toast.success("Link copied!");
  };

  const handleRemoveFromSpace = async () => {
    try {
      await api.fetch(`/comparisons/${comparison.id}`, {
        method: "PUT",
        body: JSON.stringify({ space_id: null }),
      });
      toast.success("Removed from space");
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove",
      );
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.fetch(`/comparisons/${comparison.id}`, { method: "DELETE" });
      toast.success("Comparison deleted!");
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete",
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setConfirmDelete(false);
      }}
    >
      <DialogContent className="w-[80%] max-w-[1000px] sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{comparison.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Slider preview - 60% */}
          <div className="md:col-span-3">
            <BeforeAfterSlider
              beforeImage={comparison.before_image_url}
              afterImage={comparison.after_image_url}
              className="aspect-[4/3]"
            />
          </div>

          {/* Details - 40% */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={comparison.is_published ? "default" : "secondary"}>
                {comparison.is_published ? "Published" : "Draft"}
              </Badge>
              {comparison.source === "client" && (
                <Badge variant="outline">Client Upload</Badge>
              )}
              {comparison.category && (
                <Badge variant="outline">{comparison.category}</Badge>
              )}
            </div>

            {comparison.description && (
              <p className="text-sm text-muted-foreground">
                {comparison.description}
              </p>
            )}

            <div className="text-sm text-muted-foreground">
              {comparison.view_count} views
            </div>

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={copyLink}
              >
                Copy Link
              </Button>
              {comparison.space_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleRemoveFromSpace}
                >
                  Remove from Space
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting
                  ? "Deleting..."
                  : confirmDelete
                    ? "Confirm Delete"
                    : "Delete Comparison"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
