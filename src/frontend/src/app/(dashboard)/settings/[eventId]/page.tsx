"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  FileText,
  Bell,
  MapPin,
  Video,
  Eye,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Banknote,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  events as eventsApi,
  eventFormLinks,
  formTemplates as formTemplatesApi,
  type EventCreate,
  type EventResponse,
  type EventFormLinkResponse,
  type FormTemplateResponse,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";

interface EventConfigForm {
  name: string;
  event_date: string;
  event_end_date: string;
  pricing_model: "fixed" | "donation" | "free";
  fixed_price_cents: string;
  status: "draft" | "active" | "completed" | "cancelled";
  meeting_point_a: string;
  meeting_point_b: string;
  virtual_meeting_url: string;
  reminder_delay_minutes: string;
  auto_expire_hours: string;
}

// ── Linked Forms Section ────────────────────────
function LinkedFormsSection({ eventId, isDark }: { eventId: string; isDark: boolean }) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["event-form-links", eventId],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve([]);
      return eventFormLinks.list(eventId);
    },
  });

  const { data: allTemplates } = useQuery({
    queryKey: ["form-templates-all"],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve({ data: [], meta: { total: 0, page: 1, per_page: 100 } });
      return formTemplatesApi.list({ per_page: 100 });
    },
  });

  const linkedIds = new Set(links.map((l: EventFormLinkResponse) => l.form_template_id));
  const availableTemplates = (allTemplates?.data || []).filter(
    (t: FormTemplateResponse) => !linkedIds.has(t.id)
  );

  const linkMutation = useMutation({
    mutationFn: (templateId: string) =>
      eventFormLinks.create(eventId, {
        form_template_id: templateId,
        sort_order: links.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-form-links", eventId] });
      toast.success("Form linked to event");
      setAddDialogOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to link form"),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => eventFormLinks.delete(eventId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-form-links", eventId] });
      toast.success("Form unlinked");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to unlink form"),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ linkId, sortOrder }: { linkId: string; sortOrder: number }) =>
      eventFormLinks.update(eventId, linkId, { sort_order: sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-form-links", eventId] });
    },
  });

  const toggleWaiverMutation = useMutation({
    mutationFn: ({ linkId, isWaiver }: { linkId: string; isWaiver: boolean }) =>
      eventFormLinks.update(eventId, linkId, { is_waiver: isWaiver }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-form-links", eventId] });
      toast.success("Updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update"),
  });

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
    const current = sorted[index];
    const above = sorted[index - 1];
    reorderMutation.mutate({ linkId: current.id, sortOrder: above.sort_order });
    reorderMutation.mutate({ linkId: above.id, sortOrder: current.sort_order });
  };

  const handleMoveDown = (index: number) => {
    const sorted = [...links].sort((a, b) => a.sort_order - b.sort_order);
    if (index >= sorted.length - 1) return;
    const current = sorted[index];
    const below = sorted[index + 1];
    reorderMutation.mutate({ linkId: current.id, sortOrder: below.sort_order });
    reorderMutation.mutate({ linkId: below.id, sortOrder: current.sort_order });
  };

  const sortedLinks = [...links].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-3xl mt-6 space-y-4">
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
            <FileText size={16} />
            Linked Intake Forms
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg text-xs"
            style={isDark ? { borderColor, color: textSub } : {}}
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus size={14} />
            Add Form
          </Button>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: isDark ? darkColors.surfaceHover : "#f3f4f6" }} />
            ))}
          </div>
        )}

        {!isLoading && sortedLinks.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: textMuted }}>
            No forms linked yet. Add intake forms that registrants will fill out.
          </p>
        )}

        {!isLoading && sortedLinks.length > 0 && (
          <div className="space-y-2">
            {sortedLinks.map((link, idx) => (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor, background: isDark ? darkColors.surfaceElevated : "#fafafa" }}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className="p-0.5 disabled:opacity-30 transition"
                  >
                    <ChevronUp size={12} style={{ color: textMuted }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === sortedLinks.length - 1}
                    className="p-0.5 disabled:opacity-30 transition"
                  >
                    <ChevronDown size={12} style={{ color: textMuted }} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: textMain }}>
                    {link.form_template.name}
                  </p>
                  <p className="text-[11px]" style={{ color: textMuted }}>
                    {link.form_template.form_type} &middot; {link.form_template.fields.length} fields
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Checkbox
                      id={`waiver-${link.id}`}
                      checked={link.is_waiver}
                      onCheckedChange={(checked) =>
                        toggleWaiverMutation.mutate({ linkId: link.id, isWaiver: checked === true })
                      }
                    />
                    <Label htmlFor={`waiver-${link.id}`} className="text-[11px] cursor-pointer" style={{ color: textMuted }}>
                      Waiver
                    </Label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Unlink "${link.form_template.name}" from this event?`)) {
                        unlinkMutation.mutate(link.id);
                      }
                    }}
                    className="p-1.5 rounded-lg transition hover:bg-red-50"
                    title="Unlink"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Form Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent style={{ background: cardBg, borderColor }}>
          <DialogHeader>
            <DialogTitle style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
              Link a Form Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableTemplates.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: textMuted }}>
                All templates are already linked, or no templates exist yet.
              </p>
            )}
            {availableTemplates.map((t: FormTemplateResponse) => (
              <button
                key={t.id}
                onClick={() => linkMutation.mutate(t.id)}
                disabled={linkMutation.isPending}
                className="w-full text-left rounded-xl border px-4 py-3 transition hover:shadow-sm"
                style={{
                  borderColor,
                  background: isDark ? darkColors.surfaceElevated : "#fafafa",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: textMain }}>{t.name}</p>
                <p className="text-[11px]" style={{ color: textMuted }}>
                  {t.form_type} &middot; {t.fields.length} fields
                  {t.description && ` — ${t.description}`}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allowCash, setAllowCash] = useState(false);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const inputStyle = isDark ? { background: darkColors.cream, borderColor, color: textMain } : {};
  const selectStyle = isDark
    ? { background: darkColors.cream, borderColor, color: textMain }
    : {};

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => {
      if (isDemoMode()) {
        const ev = DEMO_EVENTS.find(e => e.id === eventId) || DEMO_EVENTS[0];
        return Promise.resolve(ev as unknown as EventResponse);
      }
      return eventsApi.get(eventId);
    },
  });

  // Sync allowCash from loaded event data
  useEffect(() => {
    if (event) {
      setAllowCash((event as unknown as Record<string, unknown>).allow_cash_payment === true);
    }
  }, [event]);

  const { register, handleSubmit } = useForm<EventConfigForm>();

  const updateMutation = useMutation({
    mutationFn: (data: Partial<EventCreate>) =>
      eventsApi.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Configuration saved");
    },
    onError: () => {
      toast.error("Failed to save configuration");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event deleted");
      window.location.href = "/events";
    },
    onError: () => {
      toast.error("Failed to delete event");
    },
  });

  const onSubmit = (data: EventConfigForm) => {
    updateMutation.mutate({
      name: data.name,
      event_date: data.event_date,
      event_end_date: data.event_end_date || undefined,
      pricing_model: data.pricing_model,
      fixed_price_cents: data.fixed_price_cents
        ? Math.round(parseFloat(data.fixed_price_cents) * 100)
        : undefined,
      status: data.status,
      meeting_point_a: data.meeting_point_a || undefined,
      meeting_point_b: data.meeting_point_b || undefined,
      virtual_meeting_url: data.virtual_meeting_url || undefined,
      reminder_delay_minutes: data.reminder_delay_minutes?.trim()
        ? parseInt(data.reminder_delay_minutes.trim(), 10)
        : undefined,
      auto_expire_hours: data.auto_expire_hours?.trim()
        ? parseInt(data.auto_expire_hours.trim(), 10)
        : undefined,
    });
  };

  if (isLoading || !event) {
    return (
      <div className="max-w-3xl space-y-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border p-6 h-48 animate-pulse"
            style={{ background: cardBg, borderColor }}
          />
        ))}
      </div>
    );
  }

  const priceDollars = event.fixed_price_cents
    ? (event.fixed_price_cents / 100).toFixed(2)
    : "0.00";

  const priceDisplay =
    event.pricing_model === "free"
      ? "Free"
      : event.pricing_model === "donation"
        ? "Pay what you can"
        : event.fixed_price_cents
          ? formatCents(event.fixed_price_cents)
          : "Free";

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{
            color: textMain,
            fontFamily: "var(--font-dm-serif), serif",
          }}
        >
          Event Configuration
        </h2>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl font-semibold"
          style={isDark ? { borderColor, color: textSub } : {}}
          onClick={() => setPreviewOpen(true)}
        >
          <Eye size={14} />
          Preview Registration Form
        </Button>
      </div>

      {/* Event Details */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
          <FileText size={16} />
          Event Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Event Name
            </Label>
            <Input
              {...register("name")}
              defaultValue={event.name}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Start Date
            </Label>
            <Input
              type="date"
              {...register("event_date")}
              defaultValue={event.event_date?.split("T")[0]}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              End Date (Multi-day)
            </Label>
            <Input
              type="date"
              {...register("event_end_date")}
              defaultValue={event.event_end_date?.split("T")[0] || ""}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Pricing Model
            </Label>
            <select
              {...register("pricing_model")}
              defaultValue={event.pricing_model}
              className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400"
              style={selectStyle}
            >
              <option value="donation">Pay-What-You-Want (Donation)</option>
              <option value="fixed">Fixed Price</option>
              <option value="free">Free</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Fixed Price ($)
            </Label>
            <Input
              {...register("fixed_price_cents")}
              defaultValue={priceDollars}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Virtual Meeting URL — C2 */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
          <Video size={16} />
          Virtual Meeting Link (optional)
        </h3>
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
            Meeting URL
          </Label>
          <Input
            {...register("virtual_meeting_url")}
            defaultValue={event.virtual_meeting_url || ""}
            placeholder="https://zoom.us/j/..."
            className="mt-1 rounded-xl"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: textMuted }}>
            Shown on the day-of view and registration confirmation for virtual events
          </p>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
          <Bell size={16} />
          Reminder Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Reminder Delay
            </Label>
            <select
              {...register("reminder_delay_minutes")}
              defaultValue={event.reminder_delay_minutes}
              className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400"
              style={selectStyle}
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Auto-Expire After
            </Label>
            <select
              {...register("auto_expire_hours")}
              defaultValue={event.auto_expire_hours}
              className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400"
              style={selectStyle}
            >
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Event Status
            </Label>
            <select
              {...register("status")}
              defaultValue={event.status}
              className="w-full mt-1 p-2.5 border rounded-xl text-sm focus:outline-none focus:border-gray-400"
              style={selectStyle}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meeting Points */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
          <MapPin size={16} />
          Meeting Points
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Meeting Point A
            </Label>
            <Input
              {...register("meeting_point_a")}
              defaultValue={event.meeting_point_a || ""}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
              Meeting Point B (optional)
            </Label>
            <Input
              {...register("meeting_point_b")}
              defaultValue={event.meeting_point_b || ""}
              className="mt-1 rounded-xl"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Cash Payment Toggle */}
      <div className="rounded-2xl border p-6 shadow-sm space-y-5" style={{ background: cardBg, borderColor }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: textSub }}>
          <Banknote size={16} />
          Payment Options
        </h3>
        <div className="flex items-center gap-3">
          <Checkbox
            id="allow_cash"
            checked={allowCash}
            onCheckedChange={(checked) => {
              setAllowCash(checked === true);
              updateMutation.mutate({ allow_cash_payment: checked === true } as Partial<EventCreate>);
            }}
          />
          <div>
            <Label htmlFor="allow_cash" className="text-sm font-medium cursor-pointer" style={{ color: textMain }}>
              Allow cash payments
            </Label>
            <p className="text-xs" style={{ color: textMuted }}>
              Registrants can select &ldquo;I&apos;ll pay in person&rdquo; instead of Stripe checkout
            </p>
          </div>
        </div>
      </div>

      {/* Save / Delete */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            if (confirm("Are you sure you want to delete this event?")) {
              deleteMutation.mutate();
            }
          }}
          className="text-sm font-medium transition"
          style={{ color: isDark ? darkColors.ember : "#f43f5e" }}
        >
          Delete Event
        </button>
        <Button
          type="submit"
          className="text-white rounded-xl font-semibold"
          style={{ background: isDark ? darkColors.canopy : colors.canopy }}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>

    {/* Linked Forms Section — outside the main form */}
    <LinkedFormsSection eventId={eventId} isDark={isDark} />

    {/* C6: Registration Form Preview Modal */}
    {previewOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Registration Form Preview"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        onClick={() => setPreviewOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setPreviewOpen(false); }}
      >
        <div className={`absolute inset-0 ${isDark ? "bg-black/60" : "bg-black/30"}`} />
        <div
          className="relative rounded-2xl border shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
          style={{ background: isDark ? darkColors.surfaceElevated : "#ffffff", borderColor }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg transition"
            style={{ color: textMuted }}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>

          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: isDark ? darkColors.canopy : colors.canopy }}>
            Registration Preview
          </p>
          <h3 className="text-2xl font-bold mb-4" style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
            {event.name}
          </h3>

          <div className="flex flex-wrap gap-4 text-sm mb-6" style={{ color: textSub }}>
            <span>{event.event_date?.split("T")[0]}</span>
            <span>{priceDisplay}</span>
            {event.meeting_point_a && <span>{event.meeting_point_a}</span>}
          </div>

          {/* Preview fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>First name *</label>
                <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>Jane</div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Last name *</label>
                <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>Doe</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Email *</label>
                <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>jane@example.com</div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Phone</label>
                <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>+1 (404) 555-1234</div>
              </div>
            </div>

            {event.pricing_model === "donation" && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Your contribution (USD)</label>
                <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>$25.00</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Accommodation preference</label>
              <div className="rounded-xl border p-2.5 text-sm" style={{ borderColor, color: textMuted }}>Select accommodation...</div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: textMuted }}>Dietary restrictions</label>
              <div className="rounded-xl border p-2.5 text-sm h-14" style={{ borderColor, color: textMuted }}>e.g., vegan, gluten-free...</div>
            </div>

            <div className="border-t pt-4" style={{ borderColor }}>
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded border mt-0.5" style={{ borderColor: isDark ? darkColors.canopy : colors.canopy }} />
                <p className="text-xs" style={{ color: textSub }}>
                  I accept the Visitor Agreement — waiver of liability and community guidelines *
                </p>
              </div>
            </div>

            <div
              className="rounded-xl p-3 text-center text-white font-semibold"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
            >
              {event.pricing_model === "free" ? "Complete Registration" : "Continue to Payment"}
            </div>
          </div>

          <p className="text-center text-[11px] mt-3" style={{ color: textMuted }}>
            This is a read-only preview of the public registration form
          </p>
        </div>
      </div>
    )}
    </>
  );
}
