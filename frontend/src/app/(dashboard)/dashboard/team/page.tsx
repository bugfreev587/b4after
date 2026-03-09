"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  user_id: string;
  team_owner_id: string;
  role: string;
  member_email: string;
  member_name: string;
  created_at: string;
}

interface User {
  plan: string;
}

export default function TeamPage() {
  const api = useApiClient();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const u = await api.fetch<User>("/users/me");
      setUser(u);
      if (u.plan === "business") {
        const m = await api.fetch<TeamMember[]>("/team/members");
        setMembers(m);
      }
    } catch {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true);
    try {
      await api.fetch("/team/members", {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      toast.success("Member invited!");
      setEmail("");
      fetchData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to invite member"
      );
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      await api.fetch(`/team/members/${id}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      toast.success("Role updated!");
      fetchData();
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await api.fetch(`/team/members/${id}`, { method: "DELETE" });
      toast.success("Member removed");
      fetchData();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  if (user?.plan !== "business") {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Team Management</h1>
        <p className="text-muted-foreground mb-4">
          Team features require a Business plan
        </p>
        <Button onClick={() => router.push("/dashboard/billing")}>
          Upgrade to Business
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Team Management</h1>

      <Card className="mb-6 max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Invite Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(val) => val && setRole(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting ? "Inviting..." : "Invite Member"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No team members yet</p>
          ) : (
            <div className="space-y-4">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-4 border rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {m.member_name || m.member_email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {m.member_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={m.role}
                      onValueChange={(val) => val && handleUpdateRole(m.id, val)}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline">{m.role}</Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(m.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
