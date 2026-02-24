"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Eye, Send, Trash2, X, Mail, Plus } from "lucide-react";
import { toast } from "sonner";

import { coCreators as coCreatorsApi, events as eventsApi, CoCreatorDetail } from "@/lib/api";
import { colors } from "@/lib/theme";
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

  const { data: coCreatorsList = [], isLoading } = useQuery({
    queryKey: ["co-creators"],
    queryFn: coCreatorsApi.list,
  });

  const { data: eventsList } = useQuery({
    queryKey: ["events-brief"],
    queryFn: () => eventsApi.list({ per_page: 100 }),
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
              color: colors.forest,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Co-Creators
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage co-host access to event data
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-white font-semibold rounded-xl"
              style={{ background: colors.canopy }}
            >
              <UserPlus size={15} />
              Invite Co-Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle
                style={{
                  color: colors.forest,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                Invite Co-Creator
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </Label>
                  <Input
                    name="name"
                    required
                    className="mt-1 rounded-xl"
                    placeholder="Co-creator name"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    className="mt-1 rounded-xl"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="text-white rounded-xl"
                  style={{ background: colors.canopy }}
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
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">Loading co-creators...</p>
        </div>
      )}

      {/* Co-Creator Cards */}
      {!isLoading && coCreatorsList.length > 0
        ? coCreatorsList.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: colors.bark }}
                  >
                    {initials(c.name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.email}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      Added {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(c.id)}
                    className="p-2 rounded-lg text-gray-300 hover:text-sky-500 hover:bg-sky-50 transition"
                    title="Resend magic link"
                  >
                    <Mail size={15} />
                  </button>
                  <button
                    onClick={() => setAssignOpen(c.id)}
                    className="p-2 rounded-lg text-gray-300 hover:text-green-600 hover:bg-green-50 transition"
                    title="Assign event"
                  >
                    <Plus size={15} />
                  </button>
                  {deleteConfirm === c.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg text-xs h-8"
                        onClick={() => deleteMutation.mutate(c.id)}
                      >
                        Confirm
                      </Button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
                      className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
                      title="Delete co-creator"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Assigned events */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pl-15">
                {c.events.length > 0 ? (
                  c.events.map((evt) => (
                    <span
                      key={evt.event_id}
                      className="text-xs px-2.5 py-1 rounded-full border font-medium inline-flex items-center gap-1.5"
                      style={{
                        background: `${colors.canopy}08`,
                        color: colors.canopy,
                        borderColor: `${colors.canopy}25`,
                      }}
                    >
                      {evt.event_name}
                      {evt.can_see_amounts && (
                        <span className="text-[9px] opacity-60">($)</span>
                      )}
                      <button
                        onClick={() =>
                          removeMutation.mutate({ id: c.id, eventId: evt.event_id })
                        }
                        className="ml-0.5 hover:text-red-500 transition"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-300 italic">
                    No events assigned
                  </span>
                )}
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-1">
                  <Eye size={11} />
                  Read-only
                </span>
              </div>
            </div>
          ))
        : !isLoading && (
            <div className="text-center py-16 text-gray-400">
              <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No co-creators added yet</p>
              <p className="text-xs mt-1">
                Invite co-creators to give them read-only access to event data
              </p>
            </div>
          )}

      {/* Assign Event Dialog */}
      <Dialog open={!!assignOpen} onOpenChange={(open) => !open && setAssignOpen(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle
              style={{
                color: colors.forest,
                fontFamily: "var(--font-dm-serif), serif",
              }}
            >
              Assign Event
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignEvent} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Event
              </Label>
              <select
                name="event_id"
                required
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
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
                className="rounded border-gray-300"
              />
              <Label htmlFor="can_see_amounts" className="text-sm text-gray-600">
                Can see payment amounts
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setAssignOpen(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white rounded-xl"
                style={{ background: colors.canopy }}
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
