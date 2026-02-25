"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, Clock, AlertTriangle, Save, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { events as eventsApi, notifications, type EventResponse } from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { formatDateLong } from "@/lib/format";
import { Button } from "@/components/ui/button";

type TemplateKey = "confirmation" | "reminder" | "expiry";

interface Templates {
  [key: string]: string;
  confirmation: string;
  reminder: string;
  expiry: string;
}

const DEFAULT_TEMPLATES: Templates = {
  confirmation: `Hi {{attendee_name}},

Thank you for registering for {{event_name}}!

Date: {{event_date}}
Location: {{meeting_point}}

We're excited to welcome you to Just Love Forest. Please arrive 15 minutes early.

With love,
The JLF Team`,
  reminder: `Hi {{attendee_name}},

Friendly reminder: {{event_name}} is coming up soon!

Date: {{event_date}}
Location: {{meeting_point}}

We look forward to seeing you in the forest.

With love,
The JLF Team`,
  expiry: `Hi {{attendee_name}},

Your registration for {{event_name}} has expired because payment was not completed within the allowed window.

If you'd still like to attend, please register again at justloveforest.com.

With love,
The JLF Team`,
};

const SAMPLE_DATA: Record<string, string> = {
  "{{attendee_name}}": "Jane Doe",
  "{{event_name}}": "Emerging from Winter Retreat",
  "{{event_date}}": "February 21, 2026",
  "{{meeting_point}}": "Heated Yurt — Basecamp",
};

/** Channel capabilities are data; rendering is handled at the call site. */
type ChannelType = "email" | "sms";

const CHANNEL_DISPLAY: Record<ChannelType, string> = {
  email: "📧 Email",
  sms: "📱 SMS",
};

const TEMPLATE_META: Record<TemplateKey, { label: string; icon: typeof Mail; description: string; channels: ChannelType[] }> = {
  confirmation: {
    label: "Confirmation",
    icon: Mail,
    description: "Sent when payment is complete",
    channels: ["email"],
  },
  reminder: {
    label: "Reminder",
    icon: Clock,
    description: "Sent before event if payment pending",
    channels: ["email", "sms"],
  },
  expiry: {
    label: "Expiry Notice",
    icon: AlertTriangle,
    description: "Sent when registration auto-expires",
    channels: ["email"],
  },
};

const PLACEHOLDERS = [
  { tag: "{{attendee_name}}", desc: "Attendee's full name" },
  { tag: "{{event_name}}", desc: "Event name" },
  { tag: "{{event_date}}", desc: "Formatted event date" },
  { tag: "{{meeting_point}}", desc: "Primary meeting point" },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const subtleBg = isDark ? darkColors.surfaceHover : "#f9fafb";
  const c = isDark ? darkColors : colors;

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TemplateKey>("confirmation");
  const [templates, setTemplates] = useState<Templates>(DEFAULT_TEMPLATES);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  // Load selected event's templates
  const { data: selectedEvent } = useQuery({
    queryKey: ["event", selectedEventId],
    queryFn: () => {
      if (!selectedEventId) return null;
      if (isDemoMode()) {
        const ev = DEMO_EVENTS.find((e) => e.id === selectedEventId);
        return Promise.resolve(ev as unknown as EventResponse);
      }
      return eventsApi.get(selectedEventId);
    },
    enabled: !!selectedEventId,
  });

  // Load templates from event data when it changes
  React.useEffect(() => {
    if (selectedEvent) {
      const stored = (selectedEvent as unknown as Record<string, unknown>).notification_templates as Partial<Templates> | null;
      if (stored && typeof stored === "object") {
        setTemplates({
          confirmation: stored.confirmation ?? DEFAULT_TEMPLATES.confirmation,
          reminder: stored.reminder ?? DEFAULT_TEMPLATES.reminder,
          expiry: stored.expiry ?? DEFAULT_TEMPLATES.expiry,
        });
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
      setHasChanges(false);
    }
  }, [selectedEvent]);

  const loadTemplatesForEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setHasChanges(false);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: { notification_templates: Templates }) => {
      if (isDemoMode()) {
        return Promise.resolve({} as EventResponse);
      }
      if (!selectedEventId) return Promise.resolve({} as EventResponse);
      return eventsApi.update(selectedEventId, {
        notification_templates: data.notification_templates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", selectedEventId] });
      toast.success("Notification templates saved");
      setHasChanges(false);
    },
    onError: () => {
      toast.error("Failed to save templates");
    },
  });

  const handleTemplateChange = (value: string) => {
    setTemplates((prev) => ({ ...prev, [activeTab]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ notification_templates: templates });
  };

  const renderPreview = (text: string) => {
    let rendered = text;
    for (const [tag, value] of Object.entries(SAMPLE_DATA)) {
      // Split/join avoids regex and is safe for all placeholder strings
      rendered = rendered.split(tag).join(value);
    }
    return rendered;
  };

  const renderBlastMessage = (text: string) => {
    const replacements: Record<string, string> = {
      "{{attendee_name}}": "friend",
      "{{event_name}}": selectedEvent?.name || SAMPLE_DATA["{{event_name}}"],
      "{{event_date}}": selectedEvent?.event_date
        ? formatDateLong(selectedEvent.event_date)
        : SAMPLE_DATA["{{event_date}}"],
      "{{meeting_point}}": (selectedEvent?.meeting_point_a || "").trim() || SAMPLE_DATA["{{meeting_point}}"],
    };

    let rendered = text;
    for (const [tag, value] of Object.entries(replacements)) {
      rendered = rendered.split(tag).join(value);
    }
    return rendered;
  };

  const smsMutation = useMutation({
    mutationFn: async (message: string) => {
      if (isDemoMode()) return { sent_count: 0, failed_count: 0 };
      if (!selectedEventId) return { sent_count: 0, failed_count: 0 };
      return notifications.sendSms(selectedEventId, message);
    },
    onSuccess: () => {
      toast.success("SMS blast sent");
    },
    onError: () => {
      toast.error("Failed to send SMS blast");
    },
  });

  const handleSendSmsBlast = () => {
    if (!selectedEventId) return;
    const message = renderBlastMessage(templates[activeTab]);
    const ok = window.confirm(
      `Send this SMS blast to all complete attendees for ${selectedEvent?.name || "this event"}?`
    );
    if (!ok) return;
    smsMutation.mutate(message);
  };

  const allEvents = eventList?.data || [];

  // Event selector view
  if (!selectedEventId) {
    return (
      <div className="space-y-6">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Notification Templates
          </h2>
          <p className="text-sm mt-1" style={{ color: textSub }}>
            Configure email templates for each event
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => loadTemplatesForEvent(ev.id)}
              className="text-left rounded-2xl border p-5 shadow-sm transition hover:shadow-md"
              style={{ background: cardBg, borderColor }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? `${darkColors.canopy}20` : `${colors.canopy}15`,
                  }}
                >
                  <Bell size={18} style={{ color: c.canopy }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: textMain }}>
                    {ev.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                    {ev.event_type}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const Icon = TEMPLATE_META[activeTab].icon;
  const canSendSms = TEMPLATE_META[activeTab].channels.includes("sms");

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => setSelectedEventId(null)}
            className="text-xs font-semibold uppercase tracking-wider mb-1 transition hover:opacity-70"
            style={{ color: c.canopy }}
          >
            &larr; All Events
          </button>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Notification Templates
          </h2>
          <p className="text-sm mt-0.5" style={{ color: textSub }}>
            {selectedEvent?.name || "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-semibold"
            style={isDark ? { borderColor, color: textSub } : {}}
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye size={14} />
            {showPreview ? "Edit" : "Preview"}
          </Button>

          {canSendSms && (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-semibold"
              style={isDark ? { borderColor, color: textSub } : {}}
              onClick={handleSendSmsBlast}
              disabled={smsMutation.isPending}
            >
              <MessageSquare size={14} />
              {smsMutation.isPending ? "Sending..." : "Send SMS Blast"}
            </Button>
          )}

          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="rounded-xl font-semibold text-white"
            style={{
              background: hasChanges ? (isDark ? darkColors.canopy : colors.canopy) : textMuted,
            }}
          >
            <Save size={14} />
            {saveMutation.isPending ? "Saving..." : "Save Templates"}
          </Button>
        </div>
      </div>

      {/* Template Tabs */}
      <div className="flex gap-2">
        {(Object.keys(TEMPLATE_META) as TemplateKey[]).map((key) => {
          const meta = TEMPLATE_META[key];
          const TabIcon = meta.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{
                background: isActive
                  ? isDark
                    ? darkColors.canopy
                    : colors.canopy
                  : subtleBg,
                color: isActive ? "#ffffff" : textSub,
                borderColor: isActive ? "transparent" : borderColor,
              }}
            >
              <TabIcon size={14} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Editor / Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{ background: cardBg, borderColor }}
          >
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor }}>
              <Icon size={16} style={{ color: c.canopy }} />
              <span className="text-sm font-semibold" style={{ color: textMain }}>
                {TEMPLATE_META[activeTab].label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-lg" style={{ color: textMuted, background: isDark ? darkColors.surfaceHover : "#f3f4f6" }}>
                {TEMPLATE_META[activeTab].channels.map((ch) => CHANNEL_DISPLAY[ch]).join(" · ")}
              </span>
              <span className="text-xs ml-auto" style={{ color: textMuted }}>
                {TEMPLATE_META[activeTab].description}
              </span>
            </div>

            {showPreview ? (
              <div
                className="p-6 whitespace-pre-wrap text-sm leading-relaxed min-h-[320px]"
                style={{ color: textMain }}
              >
                {renderPreview(templates[activeTab])}
              </div>
            ) : (
              <textarea
                value={templates[activeTab]}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full p-5 text-sm leading-relaxed min-h-[320px] resize-y focus:outline-none font-mono"
                style={{
                  background: isDark ? darkColors.cream : "#fafafa",
                  color: textMain,
                  border: "none",
                }}
                placeholder="Enter your email template..."
              />
            )}
          </div>
        </div>

        {/* Variable Reference */}
        <div className="space-y-4">
          <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: cardBg, borderColor }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: textMuted }}
            >
              Available Variables
            </h3>
            <div className="space-y-2">
              {PLACEHOLDERS.map((p) => (
                <div key={p.tag} className="p-2.5 rounded-lg" style={{ background: subtleBg }}>
                  <code
                    className="text-xs font-mono font-bold"
                    style={{ color: c.canopy }}
                  >
                    {p.tag}
                  </code>
                  <p className="text-xs mt-0.5" style={{ color: textMuted }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {showPreview && (
            <div
              className="rounded-2xl border p-5 shadow-sm"
              style={{ background: cardBg, borderColor }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: textMuted }}
              >
                Sample Data Used
              </h3>
              <div className="space-y-1.5">
                {Object.entries(SAMPLE_DATA).map(([tag, value]) => (
                  <div key={tag} className="flex items-baseline gap-2 text-xs">
                    <code className="font-mono" style={{ color: c.canopy }}>
                      {tag}
                    </code>
                    <span style={{ color: textMuted }}>&rarr;</span>
                    <span style={{ color: textSub }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
