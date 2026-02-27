"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  MessageSquareText,
  Trash2,
  Pencil,
  Eye,
  Loader2,
  Mail,
  Phone,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

import {
  messageTemplates as messageTemplatesApi,
  type MessageTemplateResponse,
  type MessageTemplateCreate,
  type TemplateCategory,
  type TemplateChannel,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES: { value: TemplateCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reminder", label: "Reminder" },
  { value: "day_of", label: "Day-of" },
  { value: "post_event", label: "Post-Event" },
  { value: "confirmation", label: "Confirmation" },
  { value: "cancellation", label: "Cancellation" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  reminder: { bg: "#5b9bd518", text: "#3b7bc0", darkBg: "#60a5fa20", darkText: "#60a5fa" },
  day_of: { bg: "#e8b84b18", text: "#8b6f47", darkBg: "#fbbf2420", darkText: "#fbbf24" },
  post_event: { bg: "#9b5ba518", text: "#9b5ba5", darkBg: "#c084fc20", darkText: "#c084fc" },
  confirmation: { bg: "#2d5a3d18", text: "#2d5a3d", darkBg: "#34d39920", darkText: "#34d399" },
  cancellation: { bg: "#d4644a18", text: "#d4644a", darkBg: "#f8717120", darkText: "#f87171" },
  custom: { bg: "#6b728018", text: "#6b7280", darkBg: "#94a3b820", darkText: "#94a3b8" },
};

const CHANNEL_ICONS: Record<TemplateChannel, typeof Mail> = {
  sms: Phone,
  email: Mail,
  both: Hash,
};

const AVAILABLE_VARIABLES = [
  { name: "first_name", desc: "Attendee's first name" },
  { name: "last_name", desc: "Attendee's last name" },
  { name: "email", desc: "Attendee's email" },
  { name: "phone", desc: "Attendee's phone" },
  { name: "event_name", desc: "Event name" },
  { name: "event_date", desc: "Formatted event date" },
  { name: "event_time", desc: "Event time" },
  { name: "meeting_point", desc: "Meeting location" },
  { name: "cancel_url", desc: "Cancellation link" },
];

// Demo data for message templates
const DEMO_MESSAGE_TEMPLATES: MessageTemplateResponse[] = [
  {
    id: "mt-1",
    name: "Event Reminder",
    category: "reminder",
    channel: "both",
    subject: "Reminder: {{event_name}} is coming up!",
    body: "Hi {{first_name}},\n\nJust a friendly reminder that {{event_name}} is happening on {{event_date}}.\n\nMeeting point: {{meeting_point}}\n\nWe can't wait to see you in the forest!\n\nWith love,\nThe JLF Team",
    variables: ["first_name", "event_name", "event_date", "meeting_point"],
    is_default: true,
    created_by: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "mt-2",
    name: "Registration Confirmation",
    category: "confirmation",
    channel: "email",
    subject: "You're registered for {{event_name}}!",
    body: "Hi {{first_name}},\n\nThank you for registering for {{event_name}}!\n\nDate: {{event_date}}\nLocation: {{meeting_point}}\n\nPlease arrive 15 minutes early. If you need to cancel, use this link: {{cancel_url}}\n\nWith love,\nThe JLF Team",
    variables: ["first_name", "event_name", "event_date", "meeting_point", "cancel_url"],
    is_default: true,
    created_by: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "mt-3",
    name: "Day-of Welcome",
    category: "day_of",
    channel: "sms",
    subject: null,
    body: "Good morning {{first_name}}! Today is the day — {{event_name}} starts soon. Head to {{meeting_point}} when you arrive. See you in the forest!",
    variables: ["first_name", "event_name", "meeting_point"],
    is_default: false,
    created_by: null,
    created_at: "2026-02-10T00:00:00Z",
    updated_at: "2026-02-10T00:00:00Z",
  },
  {
    id: "mt-4",
    name: "Post-Event Thank You",
    category: "post_event",
    channel: "email",
    subject: "Thank you for attending {{event_name}}",
    body: "Dear {{first_name}},\n\nThank you so much for being part of {{event_name}}. Your presence made the gathering truly special.\n\nWe hope the forest spoke to your heart. Keep an eye on justloveforest.com for upcoming events.\n\nWith love and gratitude,\nThe JLF Team",
    variables: ["first_name", "event_name"],
    is_default: false,
    created_by: null,
    created_at: "2026-02-15T00:00:00Z",
    updated_at: "2026-02-15T00:00:00Z",
  },
  {
    id: "mt-5",
    name: "Cancellation Acknowledged",
    category: "cancellation",
    channel: "email",
    subject: "Cancellation confirmed — {{event_name}}",
    body: "Hi {{first_name}},\n\nWe've received your cancellation request for {{event_name}}. We're sorry you won't be joining us this time.\n\nWe hope to welcome you to the forest soon.\n\nWith love,\nThe JLF Team",
    variables: ["first_name", "event_name"],
    is_default: true,
    created_by: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
];

// ── Create/Edit Dialog ──────────────────────────
function MessageTemplateDialog({
  open,
  onClose,
  template,
  isDark,
}: {
  open: boolean;
  onClose: () => void;
  template?: MessageTemplateResponse;
  isDark: boolean;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || "");
  const [category, setCategory] = useState<TemplateCategory>(template?.category || "custom");
  const [channel, setChannel] = useState<TemplateChannel>(template?.channel || "email");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<{ rendered_subject: string | null; rendered_body: string } | null>(null);

  useEffect(() => {
    setName(template?.name || "");
    setCategory(template?.category || "custom");
    setChannel(template?.channel || "email");
    setSubject(template?.subject || "");
    setBody(template?.body || "");
    setShowPreview(false);
    setPreview(null);
  }, [template]);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#e5e7eb";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";
  const inputStyle = isDark ? { background: darkColors.cream, borderColor, color: textMain } : {};
  const c = isDark ? darkColors : colors;

  const createMutation = useMutation({
    mutationFn: (data: MessageTemplateCreate) => messageTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Message template created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MessageTemplateCreate>) =>
      messageTemplatesApi.update(template!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Message template updated");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update template"),
  });

  const PREVIEW_SAMPLE_DATA: Record<string, string> = {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@example.com",
    phone: "+1-404-555-0101",
    event_name: "Spring Retreat",
    event_date: "March 20, 2026",
    event_time: "3:00 PM",
    meeting_point: "Heated Yurt — Basecamp",
    cancel_url: "https://justloveforest.com/cancel/abc123",
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Message body is required");
      return;
    }
    const variables = AVAILABLE_VARIABLES
      .filter((v) => body.includes(`{{${v.name}}}`) || (subject && subject.includes(`{{${v.name}}}`)))
      .map((v) => v.name);

    const data: MessageTemplateCreate = {
      name: name.trim(),
      category,
      channel,
      subject: channel !== "sms" ? subject.trim() || null : null,
      body: body.trim(),
      variables,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handlePreview = () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    // Always render preview locally from current state (not server-stored body)
    let rendered = body;
    for (const [key, value] of Object.entries(PREVIEW_SAMPLE_DATA)) {
      rendered = rendered.split(`{{${key}}}`).join(value);
    }
    let renderedSubject: string | null = null;
    if (subject) {
      renderedSubject = subject;
      for (const [key, value] of Object.entries(PREVIEW_SAMPLE_DATA)) {
        renderedSubject = renderedSubject.split(`{{${key}}}`).join(value);
      }
    }
    setPreview({ rendered_subject: renderedSubject, rendered_body: rendered });
    setShowPreview(true);
  };

  const insertVariable = (varName: string) => {
    setBody((prev) => prev + `{{${varName}}}`);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
        style={{ background: cardBg, borderColor }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle
            className="text-xl font-bold"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            {isEdit ? "Edit Message Template" : "Create Message Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Meta fields */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Template Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Event Reminder"
                className="rounded-xl"
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger className="rounded-xl" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Channel
              </Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as TemplateChannel)}>
                <SelectTrigger className="rounded-xl" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {channel !== "sms" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Email Subject
                </Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Reminder: {{event_name}}"
                  className="rounded-xl"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <Separator style={{ background: borderColor }} />

          {/* Body + Variables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                  Message Body
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs"
                  style={isDark ? { borderColor, color: textSub } : {}}
                  onClick={handlePreview}
                >
                  <Eye size={14} />
                  {showPreview ? "Edit" : "Preview"}
                </Button>
              </div>

              {showPreview && preview ? (
                <div
                  className="rounded-xl border p-5 min-h-[200px]"
                  style={{ background: subtleBg, borderColor }}
                >
                  {preview.rendered_subject && (
                    <div className="mb-3 pb-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: textMuted }}>
                        Subject
                      </p>
                      <p className="text-sm font-medium" style={{ color: textMain }}>
                        {preview.rendered_subject}
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>
                    Body
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: textMain }}>
                    {preview.rendered_body}
                  </p>
                </div>
              ) : (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{first_name}}, ..."
                  className="rounded-xl min-h-[200px] resize-y font-mono text-sm"
                  style={isDark ? { background: darkColors.cream, borderColor, color: textMain } : {}}
                />
              )}
            </div>

            {/* Variables panel */}
            <div
              className="rounded-xl border p-4 space-y-3 self-start"
              style={{ background: subtleBg, borderColor }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Available Variables
              </p>
              <div className="space-y-1.5">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVariable(v.name)}
                    className="w-full text-left p-2 rounded-lg transition hover:opacity-80"
                    style={{ background: isDark ? darkColors.surface : "#ffffff" }}
                  >
                    <code className="text-xs font-mono font-bold" style={{ color: c.canopy }}>
                      {`{{${v.name}}}`}
                    </code>
                    <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>
                      {v.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator style={{ background: borderColor }} />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              style={isDark ? { borderColor, color: textSub } : {}}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl text-white font-semibold"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────
export default function MessageTemplatesPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateResponse | undefined>();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";

  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates", filterCategory],
    queryFn: () => {
      if (isDemoMode()) {
        const demos = filterCategory === "all"
          ? DEMO_MESSAGE_TEMPLATES
          : DEMO_MESSAGE_TEMPLATES.filter((t) => t.category === filterCategory);
        return Promise.resolve(demos);
      }
      return messageTemplatesApi.list({
        category: filterCategory === "all" ? undefined : filterCategory,
      });
    },
  });

  const filtered = templates || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messageTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast.success("Template deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete template"),
  });

  const openCreate = () => {
    setEditingTemplate(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: MessageTemplateResponse) => {
    setEditingTemplate(t);
    setDialogOpen(true);
  };

  const handleDelete = (t: MessageTemplateResponse) => {
    if (t.is_default) {
      toast.error("Default templates cannot be deleted");
      return;
    }
    if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(t.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Message Templates
          </h1>
          <p className="text-sm mt-1" style={{ color: textSub }}>
            Create and manage reusable notification templates for SMS and email
          </p>
        </div>
        <Button
          className="rounded-xl text-white font-semibold shadow-sm"
          style={{ background: isDark ? darkColors.canopy : colors.canopy }}
          onClick={openCreate}
        >
          <Plus size={16} />
          New Template
        </Button>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const active = filterCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={
                active
                  ? {
                      background: isDark ? darkColors.canopy : colors.canopy,
                      color: isDark ? "#000" : "#fff",
                    }
                  : {
                      background: isDark ? darkColors.surfaceElevated : "#f3f4f6",
                      color: textSub,
                    }
              }
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5 h-36 animate-pulse"
              style={{ background: cardBg, borderColor }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: cardBg, borderColor }}
        >
          <MessageSquareText size={40} className="mx-auto mb-4" style={{ color: textMuted }} />
          <h3
            className="text-lg font-bold mb-2"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            {filterCategory === "all" ? "No message templates yet" : `No ${filterCategory.replace("_", " ")} templates`}
          </h3>
          <p className="text-sm mb-6" style={{ color: textSub }}>
            Create reusable message templates for event communications
          </p>
          <Button
            className="rounded-xl text-white font-semibold"
            style={{ background: isDark ? darkColors.canopy : colors.canopy }}
            onClick={openCreate}
          >
            <Plus size={16} />
            Create Your First Template
          </Button>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, idx) => {
            const catColor = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.custom;
            const ChannelIcon = CHANNEL_ICONS[t.channel];
            return (
              <div
                key={t.id}
                className="group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md cursor-pointer animate-in slide-in-from-bottom-2 fade-in"
                style={{
                  background: cardBg,
                  borderColor,
                  animationDelay: `${idx * 40}ms`,
                  animationFillMode: "backwards",
                }}
                onClick={() => openEdit(t)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isDark ? catColor.darkBg : catColor.bg }}
                    >
                      <MessageSquareText size={14} style={{ color: isDark ? catColor.darkText : catColor.text }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: textMain }}>
                        {t.name}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(t);
                      }}
                      className="p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: textMuted }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    {!t.is_default && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t);
                        }}
                        className="p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ color: textMuted }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs mb-3 line-clamp-2" style={{ color: textSub }}>
                  {t.body.slice(0, 100)}{t.body.length > 100 ? "..." : ""}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: isDark ? catColor.darkBg : catColor.bg,
                      color: isDark ? catColor.darkText : catColor.text,
                    }}
                  >
                    {t.category.replace("_", " ")}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                    style={{
                      background: isDark ? darkColors.surfaceElevated : "#f3f4f6",
                      color: textMuted,
                    }}
                  >
                    <ChannelIcon size={10} />
                    {t.channel}
                  </span>
                  {t.is_default && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{
                        background: isDark ? "#fbbf2420" : "#e8b84b18",
                        color: isDark ? "#fbbf24" : "#8b6f47",
                      }}
                    >
                      Default
                    </span>
                  )}
                  {t.variables.length > 0 && (
                    <span className="text-[10px]" style={{ color: textMuted }}>
                      {t.variables.length} var{t.variables.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <MessageTemplateDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingTemplate(undefined);
          }}
          template={editingTemplate}
          isDark={isDark}
        />
      )}
    </div>
  );
}
