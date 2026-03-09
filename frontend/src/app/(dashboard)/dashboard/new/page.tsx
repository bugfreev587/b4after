"use client";

import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { ComparisonForm, ComparisonFormData } from "@/components/comparison-form";
import { toast } from "sonner";

export default function NewComparisonPage() {
  const router = useRouter();
  const api = useApiClient();

  const handleSubmit = async (data: ComparisonFormData) => {
    try {
      const result = await api.fetch<{ id: string }>("/comparisons", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Comparison created!");
      router.push(`/dashboard/${result.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create comparison");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Comparison</h1>
      <ComparisonForm onSubmit={handleSubmit} submitLabel="Create Comparison" />
    </div>
  );
}
