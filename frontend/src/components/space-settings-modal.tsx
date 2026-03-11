"use client";

import { useState } from "react";
import { useApiClient } from "@/lib/api";
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

interface Space {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  is_public: boolean;
  cta_text: string | null;
  cta_url: string | null;
}

interface SpaceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  space: Space;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function SpaceSettingsModal({
  open,
  onOpenChange,
  space,
  onUpdated,
  onDeleted,
}: SpaceSettingsModalProps) {
  const api = useApiClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update space",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.fetch(`/spaces/${space.id}`, { method: "DELETE" });
      toast.success("Space deleted!");
      onOpenChange(false);
      onDeleted();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete space",
      );
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[60%] max-w-[640px] sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Space Settings</DialogTitle>
          <DialogDescription>
            Edit space details or delete this space
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={data.name}
              onChange={(e) =>
                setData((d) => ({ ...d, name: e.target.value }))
              }
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
          <div className="space-y-2">
            <Label>Category</Label>
            <Input
              value={data.category}
              onChange={(e) =>
                setData((d) => ({ ...d, category: e.target.value }))
              }
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
              id="modalPublic"
              checked={data.is_public}
              onChange={(e) =>
                setData((d) => ({ ...d, is_public: e.target.checked }))
              }
            />
            <Label htmlFor="modalPublic">Public</Label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting
                ? "Deleting..."
                : confirmDelete
                  ? "Confirm Delete"
                  : "Delete Space"}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
