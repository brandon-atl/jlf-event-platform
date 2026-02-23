import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Calendar, Mail } from "lucide-react";

import { register } from "@/lib/api";
import { formatDateLong, formatDateShort } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await register.eventInfo(slug);
    return {
      title: `Registration Complete — ${event.name} | Just Love Forest`,
      description: `You're registered for ${event.name} at Just Love Forest!`,
    };
  } catch {
    return { title: "Registration Complete | Just Love Forest" };
  }
}

export default async function SuccessPage({ params }: Props) {
  const { slug } = await params;

  let event;
  try {
    event = await register.eventInfo(slug);
  } catch {
    // Proceed without event details
  }

  const dateDisplay = event
    ? event.event_end_date
      ? `${formatDateShort(event.event_date)} – ${formatDateShort(event.event_end_date)}`
      : formatDateLong(event.event_date)
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardContent className="py-10 text-center">
          {/* Success icon */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{ background: "#2d5a3d18" }}
          >
            <CheckCircle size={40} style={{ color: "#2d5a3d" }} />
          </div>

          <h1
            className="mb-2 text-3xl font-bold sm:text-4xl"
            style={{
              color: "#1a3a2a",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Registration Complete!
          </h1>

          <p className="mx-auto mt-3 max-w-md text-gray-500">
            Thank you for registering
            {event ? (
              <>
                {" "}
                for <strong>{event.name}</strong>
              </>
            ) : null}
            . We&apos;re so glad you&apos;re joining us in the forest.
          </p>

          <Separator className="mx-auto my-8 max-w-xs" />

          {/* Event details summary */}
          {event && (
            <div className="mx-auto mb-8 max-w-sm space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Calendar size={15} style={{ color: "#2d5a3d" }} />
                <span>{dateDisplay}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Mail size={15} style={{ color: "#2d5a3d" }} />
                <span>Confirmation email on its way</span>
              </div>
            </div>
          )}

          {/* What's next */}
          <div
            className="mx-auto max-w-md rounded-xl border p-5 text-left"
            style={{
              background: "#2d5a3d08",
              borderColor: "#2d5a3d20",
            }}
          >
            <h3
              className="mb-3 text-sm font-bold"
              style={{ color: "#1a3a2a" }}
            >
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span style={{ color: "#2d5a3d" }}>1.</span>
                Check your inbox for a confirmation email with all the details.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#2d5a3d" }}>2.</span>
                We&apos;ll send a reminder closer to the event date.
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#2d5a3d" }}>3.</span>
                Come ready to connect with nature and community!
              </li>
            </ul>
          </div>

          <Separator className="mx-auto my-8 max-w-xs" />

          <Link
            href="https://justloveforest.com"
            className="inline-block text-sm font-medium transition-colors hover:underline"
            style={{ color: "#2d5a3d" }}
          >
            &larr; Back to justloveforest.com
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
