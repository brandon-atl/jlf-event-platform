"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import {
  scholarshipLinks,
  events as eventsApi,
  type ScholarshipLinkResponse,
  type EventResponse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "JLF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function ScholarshipLinksPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const [createOpen, setCreateOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["scholarship-links"],
    queryFn: () => scholarshipLinks.list(),
  });

  const { data: eventsList } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventsApi.list({ per_page: 100 }),
  });

  const activeEvents = (eventsList?.data || []).filter(
    (e: EventResponse) => e.status === "active" || e.status === "draft"
  );

  const createMutation = useMutation({
    mutationFn: scholarshipLinks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarship-links"] });
      setCreateOpen(false);
      toast.success("Scholarship link created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: scholarshipLinks.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scholarship-links"] });
      toast.success("Scholarship link deactivated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      event_id: fd.get("event_id") as string,
      code: fd.get("code") as string,
      scholarship_price_cents: Math.round(parseFloat(fd.get("price") as string) * 100),
      max_uses: parseInt(fd.get("max_uses") as string, 10) || 1,
    });
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${colors.canopy}15` }}
          >
            <GraduationCap size={20} style={{ color: colors.canopy }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
            >
              Scholarship Links
            </h1>
            <p className="text-sm" style={{ color: textSub }}>
              Manage scholarship pricing codes for events
            </p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button
              className="rounded-xl"
              style={{ background: colors.canopy }}
            >
              <Plus size={16} className="mr-1" />
              New Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: textMain }}>
                Create Scholarship Link
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Event</Label>
                <Select name="event_id" required>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map((ev: EventResponse) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  name="code"
                  required
                  defaultValue={generateCode()}
                  className="rounded-xl font-mono"
                />
                <p className="text-xs" style={{ color: textMuted }}>
                  Auto-generated. Edit if you want a custom code.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scholarship Price</Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue="30.00"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Uses</Label>
                  <Input
                    name="max_uses"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-xl"
                style={{ background: colors.canopy }}
              >
                {createMutation.isPending ? "Creating..." : "Create Link"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? (
        <p style={{ color: textMuted }}>Loading...</p>
      ) : links.length === 0 ? (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: cardBg, borderColor }}
        >
          <GraduationCap size={40} className="mx-auto mb-3" style={{ color: textMuted }} />
          <p className="font-medium" style={{ color: textMain }}>
            No scholarship links yet
          </p>
          <p className="text-sm" style={{ color: textSub }}>
            Create a scholarship link to offer discounted event access.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link: ScholarshipLinkResponse) => {
            const isActive = link.uses < link.max_uses;
            return (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-2xl border p-4"
                style={{ background: cardBg, borderColor }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-sm font-bold"
                      style={{ color: textMain }}
                    >
                      {link.code}
                    </span>
                    <button
                      onClick={() => copyCode(link.code, link.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copiedId === link.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isActive ? "Active" : "Exhausted"}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: textSub }}>
                    {link.event_name || "Unknown event"} &middot;{" "}
                    {formatCents(link.scholarship_price_cents)} &middot;{" "}
                    {link.uses}/{link.max_uses} used
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Deactivate this scholarship link?")) {
                      deleteMutation.mutate(link.id);
                    }
                  }}
                  disabled={!isActive}
                  className="rounded-xl text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
