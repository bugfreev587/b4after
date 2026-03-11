"use client";

import { useEffect, useState } from "react";
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
}

interface RequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestModal({ open, onOpenChange }: RequestModalProps) {
  const api = useApiClient();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    space_id: "",
    client_name: "",
    client_email: "",
    request_type: "both",
    instruction_note: "",
    service_type: "",
    sent_via: "manual_link",
  });

  useEffect(() => {
    if (open) {
      api
        .fetch<Space[]>("/spaces")
        .then(setSpaces)
        .catch(() => {});
    }
  }, [open, api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.space_id) {
      toast.error("Please select a space");
      return;
    }
    setCreating(true);
    try {
      const result = await api.fetch<{ upload_url?: string }>(
        `/spaces/${form.space_id}/requests`,
        {
          method: "POST",
          body: JSON.stringify({
            client_name: form.client_name,
            client_email: form.client_email,
            request_type: form.request_type,
            instruction_note: form.instruction_note,
            service_type: form.service_type,
            sent_via: form.sent_via,
          }),
        },
      );
      if (form.sent_via === "manual_link" && result?.upload_url) {
        await navigator.clipboard.writeText(result.upload_url);
        toast.success("Request created! Link copied to clipboard.");
      } else {
        toast.success("Request created and sent!");
      }
      setForm({
        space_id: "",
        client_name: "",
        client_email: "",
        request_type: "both",
        instruction_note: "",
        service_type: "",
        sent_via: "manual_link",
      });
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create request",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80%] max-w-[900px] sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Client Photos</DialogTitle>
          <DialogDescription>
            Send a photo upload request to your client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Space</Label>
            <Select
              value={form.space_id}
              onValueChange={(v) => {
                if (v) setForm((f) => ({ ...f, space_id: v }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a space..." />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label>Client Email / Phone</Label>
              <Input
                value={form.client_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_email: e.target.value }))
                }
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <SelectItem value="manual_link">Copy Link</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Service Type (optional)</Label>
            <Input
              value={form.service_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, service_type: e.target.value }))
              }
              placeholder="e.g., Teeth Whitening, Hair Color"
            />
          </div>

          <div className="space-y-2">
            <Label>Note to Client (optional)</Label>
            <Textarea
              value={form.instruction_note}
              onChange={(e) =>
                setForm((f) => ({ ...f, instruction_note: e.target.value }))
              }
              placeholder="e.g., Please upload a clear photo in natural lighting..."
              rows={3}
            />
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
              {creating
                ? "Creating..."
                : form.sent_via === "email"
                  ? "Send Request"
                  : "Create & Copy Link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
