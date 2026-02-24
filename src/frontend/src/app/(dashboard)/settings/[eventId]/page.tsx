"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { FileText, Bell, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { events as eventsApi, type EventCreate, type EventResponse } from "@/lib/api";
import { colors } from "@/lib/theme";
import { isDemoMode, DEMO_EVENTS } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EventConfigForm {
  name: string;
  event_date: string;
  event_end_date: string;
  pricing_model: "fixed" | "donation" | "free";
  fixed_price_cents: string;
  status: "draft" | "active" | "completed" | "cancelled";
  meeting_point_a: string;
  meeting_point_b: string;
  reminder_delay_minutes: string;
  auto_expire_hours: string;
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = use(params);
  const queryClient = useQueryClient();

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

  const { register, handleSubmit, reset } = useForm<EventConfigForm>();

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
      reminder_delay_minutes: data.reminder_delay_minutes
        ? parseInt(data.reminder_delay_minutes, 10)
        : undefined,
      auto_expire_hours: data.auto_expire_hours
        ? parseInt(data.auto_expire_hours, 10)
        : undefined,
    } as Partial<EventCreate> & { reminder_delay_minutes?: number; auto_expire_hours?: number });
  };

  if (isLoading || !event) {
    return (
      <div className="max-w-3xl space-y-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-6 h-48 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const priceDollars = event.fixed_price_cents
    ? (event.fixed_price_cents / 100).toFixed(2)
    : "0.00";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <h2
        className="text-2xl font-bold tracking-tight"
        style={{
          color: colors.forest,
          fontFamily: "var(--font-dm-serif), serif",
        }}
      >
        Event Configuration
      </h2>

      {/* Event Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <FileText size={16} />
          Event Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Event Name
            </Label>
            <Input
              {...register("name")}
              defaultValue={event.name}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Start Date
            </Label>
            <Input
              type="date"
              {...register("event_date")}
              defaultValue={event.event_date?.split("T")[0]}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              End Date (Multi-day)
            </Label>
            <Input
              type="date"
              {...register("event_end_date")}
              defaultValue={event.event_end_date?.split("T")[0] || ""}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Pricing Model
            </Label>
            <select
              {...register("pricing_model")}
              defaultValue={event.pricing_model}
              className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="donation">Pay-What-You-Want (Donation)</option>
              <option value="fixed">Fixed Price</option>
              <option value="free">Free</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Fixed Price ($)
            </Label>
            <Input
              {...register("fixed_price_cents")}
              defaultValue={priceDollars}
              className="mt-1 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Reminder Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Bell size={16} />
          Reminder Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Reminder Delay
            </Label>
            <select
              {...register("reminder_delay_minutes")}
              defaultValue={event.reminder_delay_minutes}
              className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="360">6 hours</option>
              <option value="1440">24 hours</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Auto-Expire After
            </Label>
            <select
              {...register("auto_expire_hours")}
              defaultValue={event.auto_expire_hours}
              className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"
            >
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Event Status
            </Label>
            <select
              {...register("status")}
              defaultValue={event.status}
              className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-gray-400"
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
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <MapPin size={16} />
          Meeting Points
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Meeting Point A
            </Label>
            <Input
              {...register("meeting_point_a")}
              defaultValue={event.meeting_point_a || ""}
              className="mt-1 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Meeting Point B (optional)
            </Label>
            <Input
              {...register("meeting_point_b")}
              defaultValue={event.meeting_point_b || ""}
              className="mt-1 rounded-xl"
            />
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
          className="text-sm text-rose-500 hover:text-rose-700 font-medium transition"
        >
          Delete Event
        </button>
        <Button
          type="submit"
          className="text-white rounded-xl font-semibold"
          style={{ background: colors.canopy }}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
