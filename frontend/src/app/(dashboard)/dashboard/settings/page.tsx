"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface User {
  plan: string;
}

interface SubdomainData {
  subdomain: string | null;
  domain_base: string;
}

export default function SettingsPage() {
  const api = useApiClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subdomainData, setSubdomainData] = useState<SubdomainData | null>(
    null
  );
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const u = await api.fetch<User>("/users/me");
      setUser(u);
      if (u.plan === "business") {
        const sd = await api.fetch<SubdomainData>("/settings/subdomain");
        setSubdomainData(sd);
        if (sd.subdomain) {
          setSubdomain(sd.subdomain);
        }
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.fetch<SubdomainData>("/settings/subdomain", {
        method: "POST",
        body: JSON.stringify({ subdomain }),
      });
      setSubdomainData(result);
      toast.success("Subdomain saved!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save subdomain"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (user?.plan !== "business") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="text-muted-foreground mb-4">
          Custom subdomain requires a Business plan
        </p>
        <Button onClick={() => router.push("/dashboard/billing")}>
          Upgrade to Business
        </Button>
      </div>
    );
  }

  const domainBase = subdomainData?.domain_base || "beforeafter.io";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Custom Subdomain</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="subdomain"
                  placeholder="your-business"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  className="max-w-[200px]"
                />
                <span className="text-muted-foreground">.{domainBase}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                3-63 characters, lowercase letters, numbers, and hyphens only
              </p>
            </div>
            <Button type="submit" disabled={saving || !subdomain}>
              {saving ? "Saving..." : "Save Subdomain"}
            </Button>
          </form>

          {subdomainData?.subdomain && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Your public page:</p>
              <a
                href={`${APP_URL}/p/${subdomainData.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
              >
                {APP_URL}/p/{subdomainData.subdomain}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
