"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  memberships as membershipsApi,
  attendees as attendeesApi,
  type MembershipResponse,
  type AttendeeDirectory,
} from "@/lib/api";
import { formatCents } from "@/lib/format";
import { colors, darkColors } from "@/lib/theme";
import { useDarkMode } from "@/hooks/use-dark-mode";
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

export default function MembershipsPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const [createOpen, setCreateOpen] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeDirectory | null>(null);

  const { data: membershipsList = [], isLoading } = useQuery({
    queryKey: ["memberships"],
    queryFn: () => membershipsApi.list(),
  });

  const { data: attendeeResults } = useQuery({
    queryKey: ["attendees-search", attendeeSearch],
    queryFn: () => attendeesApi.list({ search: attendeeSearch, per_page: 10 }),
    enabled: attendeeSearch.length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: membershipsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      setCreateOpen(false);
      setSelectedAttendee(null);
      setAttendeeSearch("");
      toast.success("Membership created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: membershipsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership deactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAttendee) {
      toast.error("Please select an attendee");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const discount = parseFloat(fd.get("discount") as string);
    createMutation.mutate({
      attendee_id: selectedAttendee.id,
      discount_value_cents: Math.round(discount * 100),
    });
  }

  const filteredAttendees = (attendeeResults?.data || []).filter(
    (a: AttendeeDirectory) =>
      !membershipsList.some(
        (m: MembershipResponse) => m.attendee_id === a.id && m.is_active
      )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${colors.canopy}15` }}
          >
            <Crown size={20} style={{ color: colors.canopy }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
            >
              Memberships
            </h1>
            <p className="text-sm" style={{ color: textSub }}>
              Manage JLF member discounts ($25 off per event)
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setSelectedAttendee(null);
            setAttendeeSearch("");
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="rounded-xl"
              style={{ background: colors.canopy }}
            >
              <Plus size={16} className="mr-1" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: textMain }}>
                Create Membership
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Search Attendee</Label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    placeholder="Search by name or email..."
                    value={attendeeSearch}
                    onChange={(e) => {
                      setAttendeeSearch(e.target.value);
                      setSelectedAttendee(null);
                    }}
                    className="rounded-xl pl-9"
                  />
                </div>
                {selectedAttendee ? (
                  <div
                    className="rounded-xl border p-3 text-sm"
                    style={{ borderColor: colors.canopy, background: `${colors.canopy}08` }}
                  >
                    <p className="font-medium" style={{ color: textMain }}>
                      {selectedAttendee.name}
                    </p>
                    <p style={{ color: textSub }}>{selectedAttendee.email}</p>
                  </div>
                ) : attendeeSearch.length >= 2 && filteredAttendees.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor }}>
                    {filteredAttendees.map((a: AttendeeDirectory) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAttendee(a);
                          setAttendeeSearch(a.name);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      >
                        <p className="font-medium" style={{ color: textMain }}>{a.name}</p>
                        <p style={{ color: textSub }}>{a.email}</p>
                      </button>
                    ))}
                  </div>
                ) : attendeeSearch.length >= 2 ? (
                  <p className="text-sm" style={{ color: textMuted }}>No matching attendees found</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Discount Amount</Label>
                <Input
                  name="discount"
                  type="number"
                  step="0.01"
                  defaultValue="25.00"
                  required
                  className="rounded-xl"
                />
                <p className="text-xs" style={{ color: textMuted }}>
                  Standard: $25.00 flat off per event
                </p>
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending || !selectedAttendee}
                className="w-full rounded-xl"
                style={{ background: colors.canopy }}
              >
                {createMutation.isPending ? "Creating..." : "Create Membership"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <p style={{ color: textMuted }}>Loading...</p>
      ) : membershipsList.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: cardBg, borderColor }}
        >
          <Crown size={40} className="mx-auto mb-3" style={{ color: textMuted }} />
          <p className="font-medium" style={{ color: textMain }}>
            No memberships yet
          </p>
          <p className="text-sm" style={{ color: textSub }}>
            Add members to give them a $25 discount on events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {membershipsList.map((m: MembershipResponse) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-2xl border p-4"
              style={{ background: cardBg, borderColor }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: textMain }}>
                    {m.attendee_name || "Unknown"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm" style={{ color: textSub }}>
                  {m.attendee_email} &middot;{" "}
                  {formatCents(m.discount_value_cents)} off &middot;{" "}
                  {m.tier}
                </p>
              </div>
              {m.is_active && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Deactivate this membership?")) {
                      deleteMutation.mutate(m.id);
                    }
                  }}
                  className="rounded-xl text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
