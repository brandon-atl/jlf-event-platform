"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Send,
  Megaphone,
  Mail,
  Phone,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  events as eventsApi,
  notifications,
  messageTemplates as messageTemplatesApi,
  type EventResponse,
  type MessageTemplateResponse,
  type BulkNotificationRequest,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const DEMO_MESSAGE_TEMPLATES: MessageTemplateResponse[] = [
  {
    id: "mt-1", name: "Event Reminder", category: "reminder", channel: "both",
    subject: "Reminder: {{event_name}} is coming up!", body: "Hi {{first_name}},\n\nJust a friendly reminder that {{event_name}} is happening on {{event_date}}.\n\nMeeting point: {{meeting_point}}\n\nWe can't wait to see you!\n\nWith love,\nThe JLF Team",
    variables: ["first_name", "event_name", "event_date", "meeting_point"], is_default: true, created_by: null, created_at: "2026-02-01", updated_at: "2026-02-01",
  },
  {
    id: "mt-2", name: "Registration Confirmation", category: "confirmation", channel: "email",
    subject: "You're registered for {{event_name}}!", body: "Hi {{first_name}},\n\nThank you for registering for {{event_name}}!\n\nDate: {{event_date}}\nLocation: {{meeting_point}}\n\nWith love,\nThe JLF Team",
    variables: ["first_name", "event_name", "event_date", "meeting_point"], is_default: true, created_by: null, created_at: "2026-02-01", updated_at: "2026-02-01",
  },
  {
    id: "mt-3", name: "Day-of Welcome", category: "day_of", channel: "sms",
    subject: null, body: "Good morning {{first_name}}! Today is the day — {{event_name}} starts soon. Head to {{meeting_point}} when you arrive. See you in the forest!",
    variables: ["first_name", "event_name", "meeting_point"], is_default: false, created_by: null, created_at: "2026-02-10", updated_at: "2026-02-10",
  },
];

type ChannelOption = "sms" | "email" | "both";
type MessageSource = "template" | "custom";

export default function BulkMessagingPage() {
  const { isDark } = useDarkMode();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";
  const c = isDark ? darkColors : colors;
  const inputStyle = isDark ? { background: darkColors.cream, borderColor, color: textMain } : {};

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelOption>("sms");
  const [messageSource, setMessageSource] = useState<MessageSource>("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ sent_count: number; failed_count: number } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  // Load events
  const { data: eventList } = useQuery({
    queryKey: ["events"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve({
          data: DEMO_EVENTS as unknown as EventResponse[],
          meta: { total: DEMO_EVENTS.length, page: 1, per_page: 50 },
        });
      }
      return eventsApi.list({ per_page: 50 });
    },
  });

  // Load message templates
  const { data: templateList } = useQuery({
    queryKey: ["message-templates"],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve(DEMO_MESSAGE_TEMPLATES);
      return messageTemplatesApi.list();
    },
  });

  const allEvents = eventList?.data || [];
  const allTemplates = templateList || [];
  const selectedEvent = allEvents.find((e) => e.id === selectedEventId);
  const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId);

  // Filter templates by compatible channel
  const compatibleTemplates = allTemplates.filter((t) => {
    if (channel === "both") return true;
    return t.channel === channel || t.channel === "both";
  });

  const sendMutation = useMutation({
    mutationFn: (data: BulkNotificationRequest) => {
      if (isDemoMode()) {
        return Promise.resolve({
          sent_count: selectedEvent?.total_registrations || 8,
          failed_count: 0,
          channel: data.channel,
        });
      }
      if (!selectedEventId) throw new Error("No event selected");
      return notifications.sendBulk(selectedEventId, data);
    },
    onSuccess: (data) => {
      setResult({ sent_count: data.sent_count, failed_count: data.failed_count });
      setConfirmOpen(false);
      toast.success(`Sent ${data.sent_count} messages`);
    },
    onError: (e) => {
      setConfirmOpen(false);
      toast.error(e instanceof Error ? e.message : "Failed to send messages");
    },
  });

  const handleSend = () => {
    if (!selectedEventId) {
      toast.error("Select an event first");
      return;
    }
    if (messageSource === "template" && !selectedTemplateId) {
      toast.error("Select a template");
      return;
    }
    if (messageSource === "custom" && !customMessage.trim()) {
      toast.error("Enter a message");
      return;
    }
    setIdempotencyKey(`bulk-${selectedEventId}-${Date.now()}`);
    setConfirmOpen(true);
  };

  const confirmSend = () => {
    const data: BulkNotificationRequest = {
      channel,
      template_id: messageSource === "template" ? selectedTemplateId : null,
      custom_message: messageSource === "custom" ? customMessage.trim() : null,
      subject: messageSource === "custom" && channel !== "sms" ? customSubject.trim() || null : null,
      idempotency_key: idempotencyKey,
    };
    sendMutation.mutate(data);
  };

  const messagePreview =
    messageSource === "template"
      ? selectedTemplate?.body.slice(0, 200) ?? ""
      : customMessage.slice(0, 200) + (customMessage.length > 200 ? "..." : "");

  const resetForm = () => {
    setResult(null);
    setSelectedTemplateId(null);
    setCustomMessage("");
    setCustomSubject("");
    setIdempotencyKey(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
        >
          Bulk Messaging
        </h1>
        <p className="text-sm mt-1" style={{ color: textSub }}>
          Send SMS or email notifications to all attendees of an event
        </p>
      </div>

      {/* Result card */}
      {result && (
        <div
          className="rounded-2xl border p-6 flex items-center gap-4"
          style={{
            background: result.failed_count === 0
              ? isDark ? "#34d39910" : "#2d5a3d10"
              : isDark ? "#f8717110" : "#d4644a10",
            borderColor: result.failed_count === 0
              ? isDark ? darkColors.canopy : colors.canopy
              : isDark ? darkColors.ember : colors.ember,
          }}
        >
          {result.failed_count === 0 ? (
            <CheckCircle2 size={24} style={{ color: c.canopy }} />
          ) : (
            <AlertCircle size={24} style={{ color: c.ember }} />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: textMain }}>
              {result.failed_count === 0
                ? `Successfully sent ${result.sent_count} messages`
                : `Sent ${result.sent_count} messages, ${result.failed_count} failed`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: textSub }}>
              to {selectedEvent?.name || "selected event"} attendees via {channel}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            style={isDark ? { borderColor, color: textSub } : {}}
            onClick={resetForm}
          >
            Send Another
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Step 1: Select Event */}
          <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: cardBg, borderColor }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: c.canopy }}
              >
                1
              </div>
              <h3 className="text-sm font-bold" style={{ color: textMain }}>
                Select Event
              </h3>
            </div>
            <Select
              value={selectedEventId || ""}
              onValueChange={(v) => {
                setSelectedEventId(v);
                setResult(null);
              }}
            >
              <SelectTrigger className="rounded-xl" style={inputStyle}>
                <SelectValue placeholder="Choose an event..." />
              </SelectTrigger>
              <SelectContent>
                {allEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name} ({ev.total_registrations} attendees)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Choose Channel */}
          <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: cardBg, borderColor }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: c.canopy }}
              >
                2
              </div>
              <h3 className="text-sm font-bold" style={{ color: textMain }}>
                Choose Channel
              </h3>
            </div>
            <div className="flex gap-3">
              {(["sms", "email", "both"] as ChannelOption[]).map((ch) => {
                const isActive = channel === ch;
                const Icon = ch === "sms" ? Phone : ch === "email" ? Mail : Hash;
                return (
                  <button
                    key={ch}
                    onClick={() => {
                      setChannel(ch);
                      setSelectedTemplateId(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition border"
                    style={{
                      background: isActive ? (isDark ? `${c.canopy}20` : `${colors.canopy}15`) : "transparent",
                      borderColor: isActive ? c.canopy : borderColor,
                      color: isActive ? c.canopy : textSub,
                    }}
                  >
                    <Icon size={16} />
                    {ch === "both" ? "Both" : ch.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Compose Message */}
          <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: cardBg, borderColor }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: c.canopy }}
              >
                3
              </div>
              <h3 className="text-sm font-bold" style={{ color: textMain }}>
                Compose Message
              </h3>
            </div>

            {/* Source toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMessageSource("template")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition"
                style={{
                  background: messageSource === "template"
                    ? isDark ? darkColors.canopy : colors.canopy
                    : isDark ? darkColors.surfaceElevated : "#f3f4f6",
                  color: messageSource === "template"
                    ? isDark ? "#000" : "#fff"
                    : textSub,
                }}
              >
                <FileText size={14} />
                Use Template
              </button>
              <button
                onClick={() => setMessageSource("custom")}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition"
                style={{
                  background: messageSource === "custom"
                    ? isDark ? darkColors.canopy : colors.canopy
                    : isDark ? darkColors.surfaceElevated : "#f3f4f6",
                  color: messageSource === "custom"
                    ? isDark ? "#000" : "#fff"
                    : textSub,
                }}
              >
                <Megaphone size={14} />
                Custom Message
              </button>
            </div>

            {messageSource === "template" ? (
              <div className="space-y-3">
                <Select
                  value={selectedTemplateId || ""}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger className="rounded-xl" style={inputStyle}>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.channel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTemplate && (
                  <div
                    className="rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: subtleBg, borderColor, color: textMain }}
                  >
                    {selectedTemplate.subject && (
                      <p className="font-semibold mb-2">
                        Subject: {selectedTemplate.subject}
                      </p>
                    )}
                    {selectedTemplate.body}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {channel !== "sms" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs" style={{ color: textMuted }}>
                      Email Subject
                    </Label>
                    <Input
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Message subject..."
                      className="rounded-xl"
                      style={inputStyle}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: textMuted }}>
                    Message Body
                  </Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Hi {{first_name}}, ..."
                    className="rounded-xl min-h-[150px] resize-y text-sm"
                    style={isDark ? { background: darkColors.cream, borderColor, color: textMain } : {}}
                  />
                </div>
                <p className="text-[10px]" style={{ color: textMuted }}>
                  Available variables: {"{{first_name}}"}, {"{{event_name}}"}, {"{{event_date}}"}, {"{{meeting_point}}"}, {"{{cancel_url}}"}
                </p>
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={handleSend}
            className="w-full rounded-xl text-white font-semibold py-6"
            style={{ background: isDark ? darkColors.canopy : colors.canopy }}
            disabled={
              !selectedEventId ||
              (messageSource === "template" && !selectedTemplateId) ||
              (messageSource === "custom" && !customMessage.trim())
            }
          >
            <Send size={16} />
            Send Bulk Message
          </Button>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border p-5 shadow-sm sticky top-4"
            style={{ background: cardBg, borderColor }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: textMuted }}
            >
              Summary
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>
                  Event
                </p>
                <p className="text-sm font-medium" style={{ color: textMain }}>
                  {selectedEvent?.name || "Not selected"}
                </p>
              </div>
              <Separator style={{ background: borderColor }} />
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>
                  Recipients
                </p>
                <p className="text-sm font-medium" style={{ color: textMain }}>
                  {selectedEvent
                    ? `${selectedEvent.complete_count + (selectedEvent.cash_pending_count || 0)} attendees`
                    : "—"}
                </p>
                {selectedEvent && (
                  <p className="text-[10px]" style={{ color: textMuted }}>
                    Complete + Cash Pending registrations
                  </p>
                )}
              </div>
              <Separator style={{ background: borderColor }} />
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>
                  Channel
                </p>
                <p className="text-sm font-medium capitalize" style={{ color: textMain }}>
                  {channel}
                </p>
              </div>
              <Separator style={{ background: borderColor }} />
              <div>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>
                  Source
                </p>
                <p className="text-sm font-medium" style={{ color: textMain }}>
                  {messageSource === "template"
                    ? selectedTemplate?.name || "No template selected"
                    : "Custom message"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent style={{ background: cardBg, borderColor }}>
          <DialogHeader>
            <DialogTitle style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
              Confirm Bulk Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: textMuted }}>Event</span>
              <span className="font-medium" style={{ color: textMain }}>
                {selectedEvent?.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: textMuted }}>Recipients</span>
              <span className="font-medium" style={{ color: textMain }}>
                {selectedEvent ? (selectedEvent.complete_count + (selectedEvent.cash_pending_count || 0)) : 0} attendees
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: textMuted }}>Channel</span>
              <span className="font-medium capitalize" style={{ color: textMain }}>
                {channel}
              </span>
            </div>
            <Separator style={{ background: borderColor }} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: textMuted }}>
                Message Preview
              </p>
              <div
                className="rounded-lg p-3 text-sm whitespace-pre-wrap"
                style={{ background: subtleBg, color: textMain }}
              >
                {messagePreview || "No message content"}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              style={isDark ? { borderColor, color: textSub } : {}}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl text-white font-semibold"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
              disabled={sendMutation.isPending}
              onClick={confirmSend}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
