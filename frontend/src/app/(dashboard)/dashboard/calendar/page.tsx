"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Image,
  Video,
  Quote,
  Lightbulb,
  Loader2,
} from "lucide-react";

interface CalendarEntry {
  id: string;
  scheduled_date: string;
  content_type: string;
  platform: string;
  caption_template: string;
  status: string;
  comparison_id: string;
}

interface CalendarSettings {
  weekly_frequency: number;
  preferred_platforms: string[];
  preferred_content_types: string[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const PLATFORMS = ["instagram", "facebook", "tiktok", "twitter"];
const CONTENT_TYPES = ["before_after", "review_quote", "timeline", "tip"];

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  before_after: <Image className="h-3 w-3" />,
  review_quote: <Quote className="h-3 w-3" />,
  timeline: <Video className="h-3 w-3" />,
  tip: <Lightbulb className="h-3 w-3" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "default",
  facebook: "secondary",
  tiktok: "outline",
  twitter: "secondary",
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function CalendarPage() {
  const api = useApiClient();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [settings, setSettings] = useState<CalendarSettings | null>(null);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Settings editing state
  const [editFrequency, setEditFrequency] = useState(3);
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);
  const [editContentTypes, setEditContentTypes] = useState<string[]>([]);

  const weekEnd = addDays(weekStart, 6);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await api.fetch<CalendarEntry[]>(
        `/content-calendar?start=${formatDate(weekStart)}&end=${formatDate(weekEnd)}`
      );
      setEntries(data);
    } catch {
      toast.error("Failed to load calendar entries");
    }
  }, [api, weekStart, weekEnd]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.fetch<CalendarSettings>(
        "/content-calendar/settings"
      );
      setSettings(data);
      setEditFrequency(data.weekly_frequency);
      setEditPlatforms(data.preferred_platforms);
      setEditContentTypes(data.preferred_content_types);
    } catch {
      // Settings may not exist yet
    }
  }, [api]);

  useEffect(() => {
    Promise.all([fetchEntries(), fetchSettings()]).finally(() =>
      setLoading(false)
    );
  }, [fetchEntries, fetchSettings]);

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const handleToggleStatus = async (entry: CalendarEntry) => {
    const newStatus =
      entry.status === "scheduled" ? "published" : "skipped";
    try {
      await api.fetch(`/content-calendar/${entry.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: newStatus } : e
        )
      );
      toast.success(`Marked as ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.fetch("/content-calendar/generate", {
        method: "POST",
        body: JSON.stringify({
          start_date: formatDate(weekStart),
          end_date: formatDate(weekEnd),
        }),
      });
      toast.success("Calendar entries generated");
      await fetchEntries();
    } catch {
      toast.error("Failed to generate entries");
    } finally {
      setGenerating(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setEditPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleContentType = (type: string) => {
    setEditContentTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.fetch("/content-calendar/settings", {
        method: "PUT",
        body: JSON.stringify({
          weekly_frequency: editFrequency,
          preferred_platforms: editPlatforms,
          preferred_content_types: editContentTypes,
        }),
      });
      setSettings({
        weekly_frequency: editFrequency,
        preferred_platforms: editPlatforms,
        preferred_content_types: editContentTypes,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getEntriesForDay = (dayIndex: number) => {
    const dayDate = formatDate(addDays(weekStart, dayIndex));
    return entries.filter((e) => e.scheduled_date.startsWith(dayDate));
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading calendar...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Calendar</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Generate Week
        </Button>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={handlePrevWeek}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm font-medium">
          {weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          &mdash;{" "}
          {weekEnd.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextWeek}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {DAY_NAMES.map((day, i) => {
          const dayDate = addDays(weekStart, i);
          const dayEntries = getEntriesForDay(i);
          const isToday = formatDate(dayDate) === formatDate(new Date());

          return (
            <div key={day} className="min-h-[160px]">
              <div
                className={`text-center text-sm font-medium mb-2 pb-1 border-b ${
                  isToday
                    ? "text-primary border-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div>{day}</div>
                <div className="text-xs">{dayDate.getDate()}</div>
              </div>
              <div className="space-y-1">
                {dayEntries.map((entry) => (
                  <Card
                    key={entry.id}
                    className="cursor-pointer hover:shadow-sm transition-shadow p-2"
                    onClick={() => handleToggleStatus(entry)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {CONTENT_TYPE_ICONS[entry.content_type] || null}
                        <Badge variant="outline" className="text-[10px] px-1">
                          {entry.content_type.replace("_", " ")}
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          (PLATFORM_COLORS[entry.platform] ?? "secondary") as
                            | "default"
                            | "secondary"
                            | "outline"
                            | "destructive"
                        }
                        className="text-[10px] px-1"
                      >
                        {entry.platform}
                      </Badge>
                      <Badge
                        variant={
                          entry.status === "published"
                            ? "default"
                            : entry.status === "skipped"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px] px-1"
                      >
                        {entry.status}
                      </Badge>
                      {entry.caption_template && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {entry.caption_template}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle>Calendar Settings</CardTitle>
            {settingsOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {settingsOpen && (
          <CardContent>
            <form
              onSubmit={handleSaveSettings}
              className="space-y-4 max-w-xl"
            >
              <div className="space-y-2">
                <Label htmlFor="frequency">Weekly Frequency</Label>
                <Input
                  id="frequency"
                  type="number"
                  min={1}
                  max={21}
                  value={editFrequency}
                  onChange={(e) =>
                    setEditFrequency(parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Platforms</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <Button
                      key={platform}
                      type="button"
                      variant={
                        editPlatforms.includes(platform)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                    >
                      {platform}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content Types</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={
                        editContentTypes.includes(type)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => toggleContentType(type)}
                    >
                      {type.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
