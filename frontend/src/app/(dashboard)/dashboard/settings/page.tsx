"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/api";
import { useTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SubdomainData {
  subdomain: string | null;
  domain_base: string;
}


export default function SettingsPage() {
  const api = useApiClient();
  const { tenant, isOwner, plan, refetch: refetchTenant } = useTenant();
  const [workspaceName, setWorkspaceName] = useState("");
  const [subdomainData, setSubdomainData] = useState<SubdomainData | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingSubdomain, setSavingSubdomain] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (plan === "business") {
        const sd = await api.fetch<SubdomainData>("/settings/subdomain").catch(() => null);
        if (sd) {
          setSubdomainData(sd);
          if (sd.subdomain) setSubdomain(sd.subdomain);
        }
      }
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [api, plan]);

  useEffect(() => {
    if (tenant) {
      setWorkspaceName(tenant.name);
      setLoading(false);
    }
    fetchData();
  }, [tenant, fetchData]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setSavingName(true);
    try {
      await api.fetch("/tenant", {
        method: "PUT",
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
      await refetchTenant();
      toast.success("Workspace name updated!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update workspace name",
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSubdomain(true);
    try {
      const result = await api.fetch<SubdomainData>("/settings/subdomain", {
        method: "POST",
        body: JSON.stringify({ subdomain }),
      });
      setSubdomainData(result);
      toast.success("Subdomain saved!");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save subdomain",
      );
    } finally {
      setSavingSubdomain(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const domainBase = subdomainData?.domain_base || "beforeafter.io";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6 max-w-xl">
        {/* Workspace Name — all plans */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <form onSubmit={handleSaveName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace Name</Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="My Business"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={savingName || !workspaceName.trim()}
                >
                  {savingName ? "Saving..." : "Save"}
                </Button>
              </form>
            ) : (
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <p className="text-sm text-muted-foreground">
                  {tenant?.name ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Only the workspace owner can change the name.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subdomain — Business plan */}
        {plan === "business" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Subdomain</CardTitle>
            </CardHeader>
            <CardContent>
              {isOwner ? (
                <>
                  <form onSubmit={handleSaveSubdomain} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subdomain">Subdomain</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="subdomain"
                          placeholder="your-business"
                          value={subdomain}
                          onChange={(e) =>
                            setSubdomain(e.target.value.toLowerCase())
                          }
                          className="max-w-[200px]"
                        />
                        <span className="text-muted-foreground">
                          .{domainBase}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        3-63 characters, lowercase letters, numbers, and hyphens
                        only
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={savingSubdomain || !subdomain}
                    >
                      {savingSubdomain ? "Saving..." : "Save Subdomain"}
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
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Subdomain</Label>
                  <p className="text-sm text-muted-foreground">
                    {subdomainData?.subdomain
                      ? `${subdomainData.subdomain}.${domainBase}`
                      : "Not configured"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only the workspace owner can change the subdomain.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
