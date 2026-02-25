"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Eye, Send, Trash2, X, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

import { coCreators as coCreatorsApi, events as eventsApi, CoCreatorDetail } from "@/lib/api";
import { isDemoMode, DEMO_COCREATORS, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { colors, darkColors } from "@/lib/theme";
import { initials, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CoCreatorsPage() {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const { isDark } = useDarkMode();

  const c = isDark ? darkColors : colors;
  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const hoverBg = isDark ? darkColors.surfaceHover : "#f9fafb";

  const { data: coCreatorsList = [], isLoading } = useQuery({
    queryKey: ["co-creators"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve(DEMO_COCREATORS.map(cc => ({
          ...cc,
          created_at: cc.last_active,
          events: cc.events.map((name, i) => ({
            event_id: `e${i + 1}`,
            event_name: name,
            can_see_amounts: false,
          })),
        })) as unknown as CoCreatorDetail[]);
      }
      return coCreatorsApi.list();
    },
  });

  const { data: eventsList } = useQuery({
    queryKey: ["events-brief"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve({
          data: DEMO_EVENTS as unknown as import("@/lib/api").EventResponse[],
          meta: { total: DEMO_EVENTS.length, page: 1, per_page: 100 },
        });
      }
      return eventsApi.list({ per_page: 100 });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: coCreatorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["co-creators"] });
      toast.success("Co-creator removed");
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to delete co-creator"),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, event_id, can_see_amounts }: { id: string; event_id: string; can_see_amounts: boolean }) =>
      coCreatorsApi.assignEvent(id, { event_id, can_see_amounts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["co-creators"] });
      toast.success("Event assigned");
      setAssignOpen(null);
    },
    onError: () => toast.error("Failed to assign event"),
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) =>
      coCreatorsApi.removeEvent(id, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["co-creators"] });
      toast.success("Event removed");
    },
    onError: () => toast.error("Failed to remove event"),
  });

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string)?.trim();
    const email = (form.get("email") as string)?.trim();
    if (!name || !email) return;

    setInviting(true);
    try {
      const created = await coCreatorsApi.create({ name, email });
      await coCreatorsApi.sendInvite(created.id);
      queryClient.invalidateQueries({ queryKey: ["co-creators"] });
      toast.success("Co-creator created & magic link sent");
      setInviteOpen(false);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Failed to invite";
      toast.error(detail);
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      await coCreatorsApi.sendInvite(id);
      toast.success("Magic link sent");
    } catch {
      toast.error("Failed to send invite");
    }
  };

  const handleAssignEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignOpen) return;
    const form = new FormData(e.currentTarget);
    const eventId = form.get("event_id") as string;
    const canSeeAmounts = form.get("can_see_amounts") === "on";
    if (!eventId) return;
    assignMutation.mutate({ id: assignOpen, event_id: eventId, can_see_amounts: canSeeAmounts });
  };

  const allEvents = eventsList?.data ?? [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              color: textMain,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Co-Creators
          </h2>
          <p className="text-sm mt-0.5" style={{ color: textMuted }}>
            Manage co-host access to event data
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-white font-semibold rounded-xl"
              style={{ background: c.canopy }}
            >
              <UserPlus size={15} />
              Invite Co-Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-2xl" style={isDark ? { background: darkColors.surfaceElevated, borderColor } : {}}>
            <DialogHeader>
              <DialogTitle
                style={{
                  color: textMain,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                Invite Co-Creator
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Name
                  </Label>
                  <Input
                    name="name"
                    required
                    className="mt-1 rounded-xl"
                    placeholder="Co-creator name"
                    style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                    Email
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    className="mt-1 rounded-xl"
                    placeholder="email@example.com"
                    style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  style={isDark ? { borderColor, color: textSub } : {}}
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="text-white rounded-xl"
                  style={{ background: c.canopy }}
                >
                  <Send size={14} />
                  {inviting ? "Sending..." : "Create & Send Magic Link"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16" style={{ color: textMuted }}>
          <p className="text-sm">Loading co-creators...</p>
        </div>
      )}

      {/* Co-Creator Cards */}
      {!isLoading && coCreatorsList.length > 0
        ? coCreatorsList.map((cc) => (
            <div
              key={cc.id}
              className="rounded-2xl border p-5 shadow-sm"
              style={{ background: cardBg, borderColor }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: c.bark }}
                  >
                    {initials(cc.name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: textMain }}>{cc.name}</p>
                    <p className="text-xs" style={{ color: textMuted }}>{cc.email}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: isDark ? darkColors.textMuted : "#d1d5db" }}>
                      Added {formatDate(cc.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(cc.id)}
                    className="p-2 rounded-lg transition"
                    style={{ color: textMuted }}
                    title="Resend magic link"
                  >
                    <Mail size={15} />
                  </button>
                  <button
                    onClick={() => setAssignOpen(cc.id)}
                    className="p-2 rounded-lg transition"
                    style={{ color: textMuted }}
                    title="Assign event"
                  >
                    <Plus size={15} />
                  </button>
                  {deleteConfirm === cc.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg text-xs h-8"
                        onClick={() => deleteMutation.mutate(cc.id)}
                      >
                        Confirm
                      </Button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg transition"
                        style={{ color: textMuted }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(cc.id)}
                      className="p-2 rounded-lg transition"
                      style={{ color: textMuted }}
                      title="Delete co-creator"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Assigned events */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pl-16">
                {cc.events.length > 0 ? (
                  cc.events.map((evt) => (
                    <span
                      key={evt.event_id}
                      className="text-xs px-2.5 py-1 rounded-full border font-medium inline-flex items-center gap-1.5"
                      style={{
                        background: `${c.canopy}08`,
                        color: c.canopy,
                        borderColor: `${c.canopy}25`,
                      }}
                    >
                      {evt.event_name}
                      {evt.can_see_amounts && (
                        <span className="text-[9px] opacity-60">($)</span>
                      )}
                      <button
                        onClick={() =>
                          removeMutation.mutate({ id: cc.id, eventId: evt.event_id })
                        }
                        className="ml-0.5 hover:text-red-500 transition"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic" style={{ color: textMuted }}>
                    No events assigned
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: hoverBg, color: textSub }}>
                  <Eye size={11} />
                  Read-only
                </span>
              </div>
            </div>
          ))
        : !isLoading && (
            <div className="text-center py-16" style={{ color: textMuted }}>
              <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No co-creators added yet</p>
              <p className="text-xs mt-1">
                Invite co-creators to give them read-only access to event data
              </p>
            </div>
          )}

      {/* Assign Event Dialog */}
      <Dialog open={!!assignOpen} onOpenChange={(open) => !open && setAssignOpen(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl" style={isDark ? { background: darkColors.surfaceElevated, borderColor } : {}}>
          <DialogHeader>
            <DialogTitle
              style={{
                color: textMain,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              Assign Event
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignEvent} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Event
              </Label>
              <select
                name="event_id"
                required
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                style={isDark ? { background: darkColors.surface, borderColor, color: textMain } : {}}
              >
                <option value="">Select an event...</option>
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="can_see_amounts"
                id="can_see_amounts"
                className="rounded"
                style={isDark ? { borderColor } : {}}
              />
              <Label htmlFor="can_see_amounts" className="text-sm" style={{ color: textSub }}>
                Can see payment amounts
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                style={isDark ? { borderColor, color: textSub } : {}}
                onClick={() => setAssignOpen(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white rounded-xl"
                style={{ background: c.canopy }}
              >
                Assign
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
