"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface InviteDetails {
  id: string;
  email: string;
  tenant_name: string;
  inviter_name: string;
  inviter_email: string;
  expires_at: string;
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const api = useApiClient();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    fetch(`${API_URL}/invites/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Invite not found");
        }
        return res.json();
      })
      .then(setInvite)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await api.fetch(`/invites/${token}/accept`, { method: "POST" });
      toast.success("You've joined the workspace!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Invitation Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle>Workspace Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            <strong>{invite?.inviter_name || invite?.inviter_email}</strong>{" "}
            has invited you to join{" "}
            <strong>{invite?.tenant_name}</strong> on BeforeAfter.io.
          </p>

          {isSignedIn ? (
            <div className="flex gap-3">
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting ? "Joining..." : "Accept Invitation"}
              </Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Decline
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign in or create an account to accept this invitation.
              </p>
              <Button
                onClick={() =>
                  router.push(
                    `/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`,
                  )
                }
              >
                Sign In to Accept
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
