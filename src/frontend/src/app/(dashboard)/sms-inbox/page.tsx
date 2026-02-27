"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  RefreshCw,
  Search,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  smsConversations as smsApi,
  type SMSConversationSummary,
  type SMSConversationEntry,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Demo data
const DEMO_CONVERSATIONS: SMSConversationSummary[] = [
  {
    attendee_phone: "+1-770-555-0101",
    attendee_name: "Mara Chen",
    last_message: "Thanks for the reminder! I'll be there early.",
    last_message_at: "2026-02-27T14:30:00Z",
    message_count: 4,
  },
  {
    attendee_phone: "+1-404-555-0102",
    attendee_name: "Devon Okafor",
    last_message: "Is there vegetarian food available?",
    last_message_at: "2026-02-27T12:15:00Z",
    message_count: 3,
  },
  {
    attendee_phone: "+1-678-555-0103",
    attendee_name: "Sage Willowbrook",
    last_message: "Can I bring a friend to the community weekend?",
    last_message_at: "2026-02-26T18:45:00Z",
    message_count: 5,
  },
  {
    attendee_phone: "+1-770-555-0104",
    attendee_name: "River Nakamura",
    last_message: "Your registration for March Community Weekend is confirmed!",
    last_message_at: "2026-02-26T10:00:00Z",
    message_count: 2,
  },
  {
    attendee_phone: "+1-404-555-0105",
    attendee_name: "Juniper Hayes",
    last_message: "What should I bring for self-camping?",
    last_message_at: "2026-02-25T16:20:00Z",
    message_count: 6,
  },
];

function getDemoThread(phone: string): SMSConversationEntry[] {
  const conv = DEMO_CONVERSATIONS.find((c) => c.attendee_phone === phone);
  const name = conv?.attendee_name || "Unknown";
  const base = new Date("2026-02-25T10:00:00Z");

  if (phone === "+1-770-555-0101") {
    return [
      { id: "m1", registration_id: null, attendee_phone: phone, direction: "outbound", body: `Hi ${name.split(" ")[0]}! Friendly reminder that March Community Weekend is coming up on March 6th. Meeting at Basecamp Welcome Circle.`, twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 0).toISOString() },
      { id: "m2", registration_id: null, attendee_phone: phone, direction: "inbound", body: "Thanks for the reminder! What time should I arrive?", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 3600000).toISOString() },
      { id: "m3", registration_id: null, attendee_phone: phone, direction: "outbound", body: "Gates open at 3 PM on Friday. Feel free to arrive anytime after that!", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 7200000).toISOString() },
      { id: "m4", registration_id: null, attendee_phone: phone, direction: "inbound", body: "Thanks for the reminder! I'll be there early.", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 86400000).toISOString() },
    ];
  }
  if (phone === "+1-404-555-0102") {
    return [
      { id: "m5", registration_id: null, attendee_phone: phone, direction: "outbound", body: `Hi ${name.split(" ")[0]}! Your registration for the Emerging from Winter Retreat is confirmed.`, twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 0).toISOString() },
      { id: "m6", registration_id: null, attendee_phone: phone, direction: "inbound", body: "Great! Quick question — is there vegan food available?", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 7200000).toISOString() },
      { id: "m7", registration_id: null, attendee_phone: phone, direction: "inbound", body: "Is there vegetarian food available?", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 7500000).toISOString() },
    ];
  }
  // Generic thread for others
  return [
    { id: `m-${phone}-1`, registration_id: null, attendee_phone: phone, direction: "outbound", body: `Hi ${name.split(" ")[0]}! Thanks for registering for the upcoming event at Just Love Forest.`, twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 0).toISOString() },
    { id: `m-${phone}-2`, registration_id: null, attendee_phone: phone, direction: "inbound", body: conv?.last_message || "Thanks!", twilio_sid: null, sent_by: null, created_at: new Date(base.getTime() + 3600000).toISOString() },
  ];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function SmsInboxPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [replyText, setReplyText] = useState("");
  const [demoReplies, setDemoReplies] = useState<SMSConversationEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const c = isDark ? darkColors : colors;

  // Load conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ["sms-conversations"],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve(DEMO_CONVERSATIONS);
      return smsApi.list();
    },
  });

  // Load selected thread
  const { data: thread, isLoading: loadingThread } = useQuery({
    queryKey: ["sms-thread", selectedPhone],
    queryFn: () => {
      if (!selectedPhone) return null;
      if (isDemoMode()) {
        return Promise.resolve({
          attendee_phone: selectedPhone,
          attendee_name: DEMO_CONVERSATIONS.find((c) => c.attendee_phone === selectedPhone)?.attendee_name || null,
          messages: getDemoThread(selectedPhone),
          last_message_at: new Date().toISOString(),
        });
      }
      return smsApi.thread(selectedPhone);
    },
    enabled: !!selectedPhone,
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: (message: string) => {
      if (isDemoMode()) return Promise.resolve({ success: true, message_id: "demo" });
      return smsApi.reply(selectedPhone!, message);
    },
    onSuccess: () => {
      if (isDemoMode() && selectedPhone) {
        setDemoReplies((prev) => [
          ...prev,
          {
            id: `demo-reply-${Date.now()}`,
            registration_id: null,
            attendee_phone: selectedPhone,
            direction: "outbound" as const,
            body: replyText.trim(),
            twilio_sid: null,
            sent_by: null,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      queryClient.invalidateQueries({ queryKey: ["sms-thread", selectedPhone] });
      queryClient.invalidateQueries({ queryKey: ["sms-conversations"] });
      setReplyText("");
      toast.success("Reply sent");
    },
    onError: () => toast.error("Failed to send reply"),
  });

  // Scroll to bottom when thread updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.messages, demoReplies]);

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedPhone) return;
    replyMutation.mutate(replyText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const allConversations = conversations || [];
  const filteredConversations = searchQuery
    ? allConversations.filter(
        (conv) =>
          (conv.attendee_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.attendee_phone.includes(searchQuery)
      )
    : allConversations;

  const selectedConvName = allConversations.find(
    (c) => c.attendee_phone === selectedPhone
  )?.attendee_name;

  // Merge demo replies into thread messages
  const allMessages = (() => {
    const base = thread?.messages || [];
    if (!isDemoMode() || !selectedPhone) return base;
    const phoneReplies = demoReplies.filter((r) => r.attendee_phone === selectedPhone);
    return [...base, ...phoneReplies];
  })();

  // Group messages by date
  const groupedMessages: { date: string; messages: SMSConversationEntry[] }[] = [];
  if (allMessages.length > 0) {
    let currentDate = "";
    for (const msg of allMessages) {
      const msgDate = formatMessageDate(msg.created_at);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groupedMessages.push({ date: currentDate, messages: [] });
      }
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            SMS Inbox
          </h1>
          <p className="text-sm mt-1" style={{ color: textSub }}>
            Two-way SMS conversations with attendees
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl font-semibold"
          style={isDark ? { borderColor, color: textSub } : {}}
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["sms-conversations"] });
            if (selectedPhone) {
              queryClient.invalidateQueries({ queryKey: ["sms-thread", selectedPhone] });
            }
            toast.success("Refreshed");
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Two-panel layout */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden flex"
        style={{
          background: cardBg,
          borderColor,
          height: "calc(100vh - 220px)",
          minHeight: "500px",
        }}
      >
        {/* Left panel — conversation list */}
        <div
          className={`flex flex-col border-r ${
            selectedPhone ? "hidden lg:flex" : "flex"
          }`}
          style={{
            borderColor,
            width: selectedPhone ? undefined : "100%",
            minWidth: "280px",
            maxWidth: "380px",
            flex: selectedPhone ? "0 0 340px" : "1",
          }}
        >
          {/* Search */}
          <div className="p-3 border-b" style={{ borderColor }}>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: textMuted }}
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="pl-9 rounded-lg h-9 text-sm"
                style={isDark ? { background: darkColors.cream, borderColor, color: textMain } : {}}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations && (
              <div className="p-8 text-center">
                <Loader2 size={20} className="animate-spin mx-auto mb-2" style={{ color: textMuted }} />
                <p className="text-sm" style={{ color: textMuted }}>Loading conversations...</p>
              </div>
            )}

            {!loadingConversations && filteredConversations.length === 0 && (
              <div className="p-8 text-center">
                <MessageCircle size={32} className="mx-auto mb-3" style={{ color: textMuted }} />
                <p className="text-sm font-medium mb-1" style={{ color: textMain }}>
                  {searchQuery ? "No matching conversations" : "No conversations yet"}
                </p>
                <p className="text-xs" style={{ color: textMuted }}>
                  {searchQuery
                    ? "Try a different search term"
                    : "SMS conversations will appear here when attendees text in"}
                </p>
              </div>
            )}

            {filteredConversations.map((conv) => {
              const isSelected = selectedPhone === conv.attendee_phone;
              return (
                <button
                  key={conv.attendee_phone}
                  onClick={() => setSelectedPhone(conv.attendee_phone)}
                  className={`w-full text-left px-4 py-3 border-b transition-colors ${
                    !isSelected ? "hover:bg-gray-50 dark:hover:bg-gray-800" : ""
                  }`}
                  style={{
                    borderColor,
                    background: isSelected ? (isDark ? darkColors.surfaceHover : "#f0fdf4") : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                      style={{ background: c.bark }}
                    >
                      {conv.attendee_name
                        ? conv.attendee_name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                        : "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: textMain }}>
                          {conv.attendee_name || conv.attendee_phone}
                        </p>
                        <span className="text-[10px] shrink-0" style={{ color: textMuted }}>
                          {formatRelativeTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className="text-xs truncate" style={{ color: textSub }}>
                          {conv.last_message}
                        </p>
                        <span
                          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                          style={{ background: c.canopy }}
                        >
                          {conv.message_count}
                        </span>
                      </div>
                      {conv.attendee_name && (
                        <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>
                          {conv.attendee_phone}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel — message thread */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            !selectedPhone ? "hidden lg:flex" : "flex"
          }`}
        >
          {!selectedPhone ? (
            // No conversation selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle size={48} className="mx-auto mb-4" style={{ color: textMuted }} />
                <p className="text-sm font-medium" style={{ color: textMain }}>
                  Select a conversation
                </p>
                <p className="text-xs mt-1" style={{ color: textMuted }}>
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div
                className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
                style={{ borderColor }}
              >
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="lg:hidden p-1 rounded transition"
                  style={{ color: textMuted }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: c.bark }}
                >
                  {selectedConvName
                    ? selectedConvName
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                    : "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: textMain }}>
                    {selectedConvName || selectedPhone}
                  </p>
                  <p className="text-[10px]" style={{ color: textMuted }}>
                    {selectedPhone}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {loadingThread && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={20} className="animate-spin" style={{ color: textMuted }} />
                  </div>
                )}

                {!loadingThread && groupedMessages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm" style={{ color: textMuted }}>
                      No messages in this conversation
                    </p>
                  </div>
                )}

                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    {/* Date separator */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px" style={{ background: borderColor }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                        {group.date}
                      </span>
                      <div className="flex-1 h-px" style={{ background: borderColor }} />
                    </div>

                    {/* Messages */}
                    <div className="space-y-2">
                      {group.messages.map((msg) => {
                        const isOutbound = msg.direction === "outbound";
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className="max-w-[75%] rounded-2xl px-4 py-2.5"
                              style={{
                                background: isOutbound
                                  ? isDark
                                    ? darkColors.canopy
                                    : colors.canopy
                                  : isDark
                                  ? darkColors.surfaceElevated
                                  : "#f3f4f6",
                                color: isOutbound
                                  ? isDark
                                    ? "#000"
                                    : "#fff"
                                  : textMain,
                              }}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.body}
                              </p>
                              <p
                                className="text-[10px] mt-1"
                                style={{
                                  color: isOutbound
                                    ? isDark
                                      ? "#00000080"
                                      : "#ffffff99"
                                    : textMuted,
                                }}
                              >
                                {formatMessageTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="px-4 py-3 border-t shrink-0" style={{ borderColor }}>
                <div className="flex items-center gap-2">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply..."
                    className="rounded-xl text-sm flex-1"
                    style={isDark ? { background: darkColors.cream, borderColor, color: textMain } : {}}
                    disabled={replyMutation.isPending}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="rounded-xl text-white shrink-0"
                    style={{ background: isDark ? darkColors.canopy : colors.canopy }}
                    size="icon"
                  >
                    {replyMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
