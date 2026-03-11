"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { useTenant } from "@/lib/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  joined_at?: string;
  member_email: string;
  member_name: string;
  member_avatar_url: string | null;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export default function MembersPage() {
  const api = useApiClient();
  const router = useRouter();
  const { tenant, isOwner, plan } = useTenant();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [m, inv] = await Promise.all([
        api.fetch<Member[]>("/tenant/members"),
        isOwner
          ? api.fetch<Invite[]>("/tenant/invites")
          : Promise.resolve([] as Invite[]),
      ]);
      setMembers(m);
      setInvites(inv);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [api, isOwner]);

  useEffect(() => {
    if (plan !== "business") return;
    fetchData();
  }, [plan, fetchData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true);
    try {
      await api.fetch("/tenant/invites", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("Invitation sent!");
      setEmail("");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    try {
      await api.fetch(`/tenant/invites/${id}`, { method: "DELETE" });
      toast.success("Invitation cancelled");
      fetchData();
    } catch {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await api.fetch(`/tenant/invites/${id}/resend`, { method: "POST" });
      toast.success("Invitation resent");
    } catch {
      toast.error("Failed to resend invitation");
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    try {
      await api.fetch(`/tenant/members/${id}`, { method: "DELETE" });
      toast.success("Member removed");
      fetchData();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (plan !== "business") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Team Members</h1>
        <p className="text-muted-foreground mb-4">
          Team features require a Business plan.
        </p>
        <Button onClick={() => router.push("/dashboard/billing")}>
          Upgrade to Business
        </Button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Team Members</h1>
        <p className="text-muted-foreground">
          Only the workspace owner can manage members.
        </p>
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Team Members</h1>

      {/* Invite form */}
      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Invite Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Maximum 5 members per workspace.
          </p>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 border rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      {m.member_avatar_url && (
                        <AvatarImage src={m.member_avatar_url} />
                      )}
                      <AvatarFallback className="text-xs">
                        {(m.member_name || m.member_email)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {m.member_name || m.member_email}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {m.member_email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {m.role}
                    </Badge>
                    {m.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(m.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Pending Invitations ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 border rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent{" "}
                      {new Date(inv.created_at).toLocaleDateString()} — Expires{" "}
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvite(inv.id)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvite(inv.id)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
