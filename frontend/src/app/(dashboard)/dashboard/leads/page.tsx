"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Users, UserPlus, CalendarCheck } from "lucide-react";

interface LeadStats {
  total: number;
  new_count: number;
  booked_count: number;
}

interface Lead {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  service: string;
  status: string;
  created_at: string;
}

interface FormConfig {
  form_type: string;
  services: string;
  whatsapp_number: string;
  auto_reply_message: string;
}

type LeadStatus = "new" | "contacted" | "booked" | "completed" | "cancelled";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "default",
  contacted: "warning",
  booked: "success",
  completed: "secondary",
  cancelled: "destructive",
};

function getStatusVariant(status: string) {
  return (STATUS_COLORS[status as LeadStatus] ?? "secondary") as
    | "default"
    | "secondary"
    | "destructive"
    | "outline";
}

export default function LeadsPage() {
  const api = useApiClient();
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form config editing state
  const [editFormType, setEditFormType] = useState("");
  const [editServices, setEditServices] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAutoReply, setEditAutoReply] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [statsData, leadsData, configData] = await Promise.all([
        api.fetch<LeadStats>("/leads/stats"),
        api.fetch<Lead[]>("/leads"),
        api.fetch<FormConfig>("/leads/form-config"),
      ]);
      setStats(statsData);
      setLeads(leadsData);
      setFormConfig(configData);
      setEditFormType(configData.form_type);
      setEditServices(configData.services);
      setEditWhatsapp(configData.whatsapp_number);
      setEditAutoReply(configData.auto_reply_message);
    } catch {
      toast.error("Failed to load leads data");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (leadId: string, status: string) => {
    if (!status) return;
    try {
      await api.fetch(`/leads/${leadId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.fetch("/leads/form-config", {
        method: "PUT",
        body: JSON.stringify({
          form_type: editFormType,
          services: editServices,
          whatsapp_number: editWhatsapp,
          auto_reply_message: editAutoReply,
        }),
      });
      setFormConfig({
        form_type: editFormType,
        services: editServices,
        whatsapp_number: editWhatsapp,
        auto_reply_message: editAutoReply,
      });
      toast.success("Form config saved");
    } catch {
      toast.error("Failed to save form config");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading leads...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leads</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.new_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Booked</CardTitle>
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.booked_count}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No leads yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.type}</Badge>
                    </TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>{lead.service}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(val) =>
                          val && handleStatusChange(lead.id, val)
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="booked">Booked</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Config Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setConfigOpen(!configOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Lead Form Configuration</CardTitle>
            {configOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {configOpen && formConfig && (
          <CardContent>
            <form onSubmit={handleSaveConfig} className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="form_type">Form Type</Label>
                <Select
                  value={editFormType}
                  onValueChange={(val) => val && setEditFormType(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Services (comma-separated)</Label>
                <Input
                  id="services"
                  value={editServices}
                  onChange={(e) => setEditServices(e.target.value)}
                  placeholder="Haircut, Coloring, Styling"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={editWhatsapp}
                  onChange={(e) => setEditWhatsapp(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto_reply">Auto-Reply Message</Label>
                <Input
                  id="auto_reply"
                  value={editAutoReply}
                  onChange={(e) => setEditAutoReply(e.target.value)}
                  placeholder="Thanks for reaching out! We'll get back to you soon."
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
