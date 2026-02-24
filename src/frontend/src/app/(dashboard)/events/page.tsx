"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Info, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { toast } from "sonner";

import { events, type EventCreate } from "@/lib/api";
import { colors } from "@/lib/theme";
import { DEMO_EVENTS, isDemoMode } from "@/lib/demo-data";
import { EventCard } from "@/components/dashboard/event-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EventsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => {
      if (isDemoMode()) {
        return Promise.resolve({ data: DEMO_EVENTS as unknown as import("@/lib/api").EventResponse[], meta: { total: DEMO_EVENTS.length, page: 1, per_page: 50 } });
      }
      return events.list({ per_page: 50 });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: EventCreate) => events.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setDialogOpen(false);
      toast.success("Event created successfully");
    },
    onError: () => {
      toast.error("Failed to create event");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    createMutation.mutate({
      name,
      slug,
      description: (form.get("description") as string) || undefined,
      event_date: form.get("start_date") as string,
      event_end_date: (form.get("end_date") as string) || undefined,
      event_type: (form.get("event_type") as string) || "Retreats",
      pricing_model:
        (form.get("pricing") as "fixed" | "donation" | "free") || "donation",
      fixed_price_cents: form.get("price")
        ? Math.round(parseFloat(form.get("price") as string) * 100)
        : undefined,
      capacity: form.get("capacity")
        ? parseInt(form.get("capacity") as string, 10)
        : undefined,
      meeting_point_a: (form.get("meeting_a") as string) || undefined,
    });
  };

  const [showPast, setShowPast] = useState(false);
  const eventList = data?.data ?? [];

  // Determine if an event is past — shared logic (also used by EventCard)
  const isEventPast = (e: { event_end_date?: string; event_date: string; status: string }) => {
    if (e.status === "completed" || e.status === "cancelled") return true;
    const end = new Date(e.event_end_date || e.event_date);
    end.setHours(23, 59, 59, 999);
    return end < new Date();
  };

  // Split into active/upcoming vs past, sorted by date
  const upcomingEvents = eventList
    .filter((e) => !isEventPast(e))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const pastEvents = eventList
    .filter((e) => isEventPast(e))
    .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  const activeCount = upcomingEvents.filter((e) => e.status === "active").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Events
          </p>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              color: colors.forest,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Events
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage your events and registrations
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-white font-semibold rounded-xl"
              style={{ background: colors.canopy }}
            >
              <Plus size={15} />
              New Event
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
                Create New Event
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Event Name *
                  </Label>
                  <Input
                    name="name"
                    required
                    placeholder="Summer Solstice Gathering"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Description
                  </Label>
                  <Input
                    name="description"
                    placeholder="A brief description of this event..."
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Event Type *
                  </Label>
                  <select
                    name="event_type"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="Retreats">Retreat</option>
                    <option value="Community Weekend">Community Weekend</option>
                    <option value="Ashram">Ashram</option>
                    <option value="Forest Therapy">Forest Therapy</option>
                    <option value="Green Burial">Green Burial Tour</option>
                    <option value="Meditation">Meditation / Satsang</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Capacity
                  </Label>
                  <Input
                    name="capacity"
                    type="number"
                    min={1}
                    placeholder="30"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Start Date *
                  </Label>
                  <Input
                    name="start_date"
                    type="date"
                    required
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    End Date
                  </Label>
                  <Input
                    name="end_date"
                    type="date"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Pricing *
                  </Label>
                  <select
                    name="pricing"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                  >
                    <option value="donation">Pay-what-you-want</option>
                    <option value="fixed">Fixed price</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Fixed Price ($)
                  </Label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="45.00"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Meeting Point
                  </Label>
                  <Input
                    name="meeting_a"
                    placeholder="Arrival location..."
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <Info size={12} />
                Webhooks route automatically — no per-event config needed.
              </p>
              <Button
                type="submit"
                className="w-full py-3 text-white font-semibold rounded-xl"
                style={{ background: colors.canopy }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-xs text-gray-400 font-medium">
        {activeCount} active event{activeCount !== 1 ? "s" : ""}
        {pastEvents.length > 0 && (
          <span className="ml-2">· {pastEvents.length} past</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : eventList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No events yet. Create your first event!</p>
        </div>
      ) : (
        <>
          {/* Active / Upcoming Events */}
          <div className="grid gap-4">
            {upcomingEvents.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                index={i}
                isPast={false}
                onClick={() => router.push(`/dashboard/${event.id}`)}
              />
            ))}
          </div>

          {/* Past Events — collapsed by default */}
          {pastEvents.length > 0 && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowPast(!showPast)}
                aria-expanded={showPast}
                aria-controls="past-events-list"
                className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition mb-3"
              >
                <Clock size={14} />
                {pastEvents.length} past event{pastEvents.length !== 1 ? "s" : ""}
                {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showPast && (
                <div id="past-events-list" className="grid gap-3">
                  {pastEvents.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={i}
                      isPast
                      onClick={() => router.push(`/dashboard/${event.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
