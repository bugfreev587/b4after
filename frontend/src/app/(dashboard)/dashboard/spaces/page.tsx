"use client";

import { useEffect, useState, useCallback } from "react";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateComparisonModal } from "@/components/create-comparison-modal";
import { SpaceSettingsModal } from "@/components/space-settings-modal";
import { ComparisonDetailModal } from "@/components/comparison-detail-modal";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Settings,
  Copy,
  Link2,
  ExternalLink,
  MoreHorizontal,
  Plus,
  GripVertical,
} from "lucide-react";

interface Space {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  cta_text: string | null;
  cta_url: string | null;
}

interface Comparison {
  id: string;
  title: string;
  slug: string;
  category: string;
  description?: string;
  before_image_url: string;
  after_image_url: string;
  is_published: boolean;
  view_count: number;
  source: string;
  space_id: string | null;
}

interface UploadRequest {
  id: string;
  token: string;
  upload_url: string;
  client_name: string | null;
  client_email: string | null;
  request_type: string;
  status: string;
  space_id: string;
  created_at: string;
}

export default function WorkspacePage() {
  const api = useApiClient();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [requests, setRequests] = useState<UploadRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultSpaceId, setCreateDefaultSpaceId] = useState<string>();
  const [settingsSpace, setSettingsSpace] = useState<Space | null>(null);
  const [detailComparison, setDetailComparison] = useState<Comparison | null>(
    null,
  );
  const [addPickerSpaceId, setAddPickerSpaceId] = useState<string | null>(null);

  // New space inline creation
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  // Drag state
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const loadData = useCallback(async () => {
    try {
      const [s, c, r] = await Promise.all([
        api.fetch<Space[]>("/spaces"),
        api.fetch<Comparison[]>("/comparisons"),
        api.fetch<UploadRequest[]>("/upload-requests").catch(() => [] as UploadRequest[]),
      ]);
      setSpaces(s);
      setComparisons(c);
      setRequests(r);
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const comparisonsForSpace = (spaceId: string) =>
    comparisons.filter((c) => c.space_id === spaceId);

  const unassignedComparisons = comparisons.filter((c) => !c.space_id);

  const pendingRequests = requests.filter(
    (r) => r.status !== "approved" && r.status !== "rejected",
  );

  const assignComparison = async (
    comparisonId: string,
    spaceId: string | null,
  ) => {
    try {
      await api.fetch(`/comparisons/${comparisonId}`, {
        method: "PUT",
        body: JSON.stringify({ space_id: spaceId }),
      });
      setComparisons((prev) =>
        prev.map((c) =>
          c.id === comparisonId ? { ...c, space_id: spaceId } : c,
        ),
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to move comparison",
      );
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const comparisonId = active.id as string;
    const dropTarget = over.id as string;

    // Dropping on "library" means unassign
    if (dropTarget === "library") {
      assignComparison(comparisonId, null);
    } else if (dropTarget.startsWith("space-")) {
      const spaceId = dropTarget.replace("space-", "");
      assignComparison(comparisonId, spaceId);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    setCreatingSpace(true);
    try {
      await api.fetch("/spaces", {
        method: "POST",
        body: JSON.stringify({
          name: newSpaceName.trim(),
          category: "general",
        }),
      });
      setNewSpaceName("");
      toast.success("Space created!");
      loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create space",
      );
    } finally {
      setCreatingSpace(false);
    }
  };

  const copyPublicLink = (space: Space) => {
    const url = `${window.location.origin}/w/${space.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied!");
  };

  const copyEmbedCode = (space: Space) => {
    const embed = `<iframe src="${window.location.origin}/embed/w/${space.slug}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embed);
    toast.success("Embed code copied!");
  };

  const activeDragComparison = activeDragId
    ? comparisons.find((c) => c.id === activeDragId)
    : null;

  if (loading) {
    return <p className="text-muted-foreground">Loading workspace...</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Galleries</h1>
          <Button
            variant="outline"
            onClick={() => {
              setCreateDefaultSpaceId(undefined);
              setCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Comparison
          </Button>
        </div>

        {/* Spaces section */}
        <div className="space-y-4">
          {spaces.map((space) => (
            <SpaceRow
              key={space.id}
              space={space}
              comparisons={comparisonsForSpace(space.id)}
              allSpaces={spaces}
              onSettingsClick={() => setSettingsSpace(space)}
              onCopyLink={() => copyPublicLink(space)}
              onCopyEmbed={() => copyEmbedCode(space)}
              onPreview={() =>
                window.open(`/w/${space.slug}`, "_blank")
              }
              onComparisonClick={(c) => setDetailComparison(c)}
              onAddClick={() => {
                if (unassignedComparisons.length > 0) {
                  setAddPickerSpaceId(space.id);
                } else {
                  setCreateDefaultSpaceId(space.id);
                  setCreateOpen(true);
                }
              }}
              onAssign={assignComparison}
              unassignedComparisons={unassignedComparisons}
              addPickerSpaceId={addPickerSpaceId}
              setAddPickerSpaceId={setAddPickerSpaceId}
            />
          ))}

          {/* New space inline */}
          <div className="flex items-center gap-2">
            <Input
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="New space name..."
              className="max-w-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateSpace();
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSpace}
              disabled={creatingSpace || !newSpaceName.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Space
            </Button>
          </div>
        </div>

        {/* Comparison Library */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Comparison Library</h2>

          {/* Ready (unassigned) */}
          {unassignedComparisons.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Ready ({unassignedComparisons.length})
              </h3>
              <DroppableArea id="library">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {unassignedComparisons.map((comp) => (
                    <DraggableComparison
                      key={comp.id}
                      comparison={comp}
                      onClick={() => setDetailComparison(comp)}
                    >
                      <LibraryCard
                        comparison={comp}
                        spaces={spaces}
                        onViewDetails={() => setDetailComparison(comp)}
                        onAssign={(spaceId) =>
                          assignComparison(comp.id, spaceId)
                        }
                        onDelete={async () => {
                          try {
                            await api.fetch(`/comparisons/${comp.id}`, {
                              method: "DELETE",
                            });
                            toast.success("Deleted");
                            loadData();
                          } catch {
                            toast.error("Failed to delete");
                          }
                        }}
                      />
                    </DraggableComparison>
                  ))}
                </div>
              </DroppableArea>
            </div>
          )}

          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Pending ({pendingRequests.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {pendingRequests.map((req) => (
                  <Card
                    key={req.id}
                    className="p-3 text-center opacity-70"
                  >
                    <div className="w-full aspect-square bg-white/5 rounded flex items-center justify-center mb-2">
                      <span className="text-2xl">📷</span>
                    </div>
                    <p className="text-xs truncate">
                      {req.client_name || "Pending"}
                    </p>
                    <Badge
                      variant="secondary"
                      className="text-[10px] mt-1"
                    >
                      {req.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {unassignedComparisons.length === 0 &&
            pendingRequests.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No comparisons in the library. Create one or request client
                photos!
              </p>
            )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragComparison && (
          <div className="w-[120px] h-[120px] rounded-lg overflow-hidden shadow-lg ring-2 ring-purple-500 opacity-90">
            <img
              src={activeDragComparison.after_image_url}
              alt={activeDragComparison.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </DragOverlay>

      {/* Modals */}
      <CreateComparisonModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        spaces={spaces}
        defaultSpaceId={createDefaultSpaceId}
        onCreated={loadData}
      />

      {settingsSpace && (
        <SpaceSettingsModal
          open={!!settingsSpace}
          onOpenChange={(o) => {
            if (!o) setSettingsSpace(null);
          }}
          space={settingsSpace}
          onUpdated={loadData}
          onDeleted={loadData}
        />
      )}

      <ComparisonDetailModal
        open={!!detailComparison}
        onOpenChange={(o) => {
          if (!o) setDetailComparison(null);
        }}
        comparison={detailComparison}
        onUpdated={loadData}
      />
    </DndContext>
  );
}

/* ── Space Row ──────────────────────────────────────────────────── */

function SpaceRow({
  space,
  comparisons,
  allSpaces,
  onSettingsClick,
  onCopyLink,
  onCopyEmbed,
  onPreview,
  onComparisonClick,
  onAddClick,
  onAssign,
  unassignedComparisons,
  addPickerSpaceId,
  setAddPickerSpaceId,
}: {
  space: Space;
  comparisons: Comparison[];
  allSpaces: Space[];
  onSettingsClick: () => void;
  onCopyLink: () => void;
  onCopyEmbed: () => void;
  onPreview: () => void;
  onComparisonClick: (c: Comparison) => void;
  onAddClick: () => void;
  onAssign: (compId: string, spaceId: string | null) => void;
  unassignedComparisons: Comparison[];
  addPickerSpaceId: string | null;
  setAddPickerSpaceId: (id: string | null) => void;
}) {
  return (
    <DroppableArea id={`space-${space.id}`}>
      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{space.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {comparisons.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSettingsClick}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCopyEmbed}
              title="Copy Embed"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCopyLink}
              title="Copy Link"
            >
              <Link2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onPreview}
              title="Preview"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Comparison thumbnails row */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {comparisons.map((comp) => (
            <DraggableComparison
              key={comp.id}
              comparison={comp}
              onClick={() => onComparisonClick(comp)}
            >
              <div
                className="relative w-[120px] h-[120px] flex-shrink-0 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition group"
              >
                <img
                  src={comp.after_image_url}
                  alt={comp.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end">
                  <span className="text-[10px] text-white px-1 pb-1 truncate w-full opacity-0 group-hover:opacity-100 transition">
                    {comp.title}
                  </span>
                </div>
                <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition">
                  <GripVertical className="w-3 h-3 text-white" />
                </div>
              </div>
            </DraggableComparison>
          ))}

          {/* Add slot */}
          <div className="relative">
            <button
              onClick={onAddClick}
              className="w-[120px] h-[120px] flex-shrink-0 rounded-lg border-2 border-dashed border-white/20 hover:border-purple-500 transition flex items-center justify-center text-muted-foreground hover:text-purple-400"
            >
              <Plus className="w-6 h-6" />
            </button>

            {/* Picker dropdown for adding unassigned comparisons */}
            {addPickerSpaceId === space.id &&
              unassignedComparisons.length > 0 && (
                <div className="absolute top-full left-0 z-50 mt-1 bg-background border border-white/10 rounded-lg shadow-xl p-2 max-h-60 overflow-y-auto min-w-[200px]">
                  <p className="text-xs text-muted-foreground px-2 pb-2">
                    Add from library:
                  </p>
                  {unassignedComparisons.map((comp) => (
                    <button
                      key={comp.id}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-white/10 transition text-left"
                      onClick={() => {
                        onAssign(comp.id, space.id);
                        setAddPickerSpaceId(null);
                      }}
                    >
                      <img
                        src={comp.after_image_url}
                        alt={comp.title}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                      <span className="text-sm truncate">{comp.title}</span>
                    </button>
                  ))}
                  <button
                    className="w-full text-xs text-muted-foreground hover:text-white px-2 pt-2 text-left"
                    onClick={() => setAddPickerSpaceId(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
          </div>
        </div>
      </Card>
    </DroppableArea>
  );
}

/* ── Library Card (grid item with menu) ─────────────────────────── */

function LibraryCard({
  comparison,
  spaces,
  onViewDetails,
  onAssign,
  onDelete,
}: {
  comparison: Comparison;
  spaces: Space[];
  onViewDetails: () => void;
  onAssign: (spaceId: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative group">
      <div className="w-full aspect-square rounded-lg overflow-hidden">
        <img
          src={comparison.after_image_url}
          alt={comparison.title}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-xs mt-1 truncate">{comparison.title}</p>

      {/* Menu */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition">
        <DropdownMenu>
          <DropdownMenuTrigger className="p-1 bg-black/60 rounded outline-none">
            <MoreHorizontal className="w-3 h-3 text-white" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              View Details
            </DropdownMenuItem>
            {spaces.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => onAssign(s.id)}>
                Add to {s.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="text-red-400"
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ── DnD primitives ─────────────────────────────────────────────── */

function DroppableArea({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`transition ${isOver ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-background rounded-lg" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableComparison({
  comparison,
  children,
  onClick,
}: {
  comparison: Comparison;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: comparison.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none ${isDragging ? "opacity-30 scale-95" : ""}`}
      onClick={(e) => {
        // Only fire click if not dragging
        if (!isDragging) {
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}
