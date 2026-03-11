"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { ComparisonForm, ComparisonFormData } from "@/components/comparison-form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface Space {
  id: string;
  name: string;
}

export default function NewComparisonPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <NewComparisonContent />
    </Suspense>
  );
}

function NewComparisonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApiClient();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    searchParams.get("space") || "",
  );
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  useEffect(() => {
    api
      .fetch<Space[]>("/spaces")
      .then((s) => {
        setSpaces(s);
        // Auto-select if only one space or if query param set
        if (s.length === 1 && !selectedSpaceId) {
          setSelectedSpaceId(s[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSpaces(false));
  }, [api, selectedSpaceId]);

  const handleSubmit = async (data: ComparisonFormData) => {
    if (!selectedSpaceId) {
      toast.error("Please select a space first");
      return;
    }
    try {
      const result = await api.fetch<{ id: string }>("/comparisons", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Add the new comparison to the selected space
      await api.fetch(`/spaces/${selectedSpaceId}/comparisons/${result.id}`, {
        method: "POST",
      });
      toast.success("Comparison created!");
      router.push(`/dashboard/${result.id}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create comparison",
      );
    }
  };

  if (loadingSpaces) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (spaces.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-2">No spaces yet</h2>
        <p className="text-muted-foreground mb-6">
          Create a space first to organize your comparisons
        </p>
        <Link href="/dashboard/spaces/new" className={buttonVariants()}>
          Create Space
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Comparison</h1>

      <div className="mb-6 max-w-md">
        <Label>Space</Label>
        <Select value={selectedSpaceId} onValueChange={(v) => { if (v) setSelectedSpaceId(v); }}>
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

      <ComparisonForm onSubmit={handleSubmit} submitLabel="Create Comparison" />
    </div>
  );
}
