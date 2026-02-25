import type { Metadata } from "next";
import { register } from "@/lib/api";
import { RegistrationForm } from "./registration-form";
import { RegistrationClosed } from "./registration-closed";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await register.eventInfo(slug);
    return {
      title: `Register — ${event.name} | Just Love Forest`,
      description:
        event.description ||
        `Register for ${event.name} at Just Love Forest — a 716-acre nature sanctuary in Poetry, GA.`,
      openGraph: {
        title: `Register — ${event.name} | Just Love Forest`,
        description:
          event.description ||
          `Register for ${event.name} at Just Love Forest.`,
        siteName: "Just Love Forest",
        type: "website",
      },
    };
  } catch {
    return {
      title: "Register | Just Love Forest",
      description:
        "Register for an event at Just Love Forest — a 716-acre nature sanctuary in Poetry, GA.",
    };
  }
}

export default async function RegisterPage({ params }: Props) {
  const { slug } = await params;

  let event;
  let error: string | null = null;

  try {
    event = await register.eventInfo(slug);
  } catch {
    // Don't leak internal API URLs or error details to public users
    error =
      "This event could not be found. It may have ended or the link may be incorrect.";
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-2xl border border-gray-100 bg-white p-12 shadow-sm">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "#d4644a18" }}
          >
            <span className="text-2xl">🌲</span>
          </div>
          <h1
            className="mb-2 text-2xl font-bold"
            style={{
              color: "#1a3a2a",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Event Not Found
          </h1>
          <p className="text-sm text-gray-500">
            {error ||
              "This event could not be found. Please check the link and try again."}
          </p>
          <a
            href="https://justloveforest.com"
            className="mt-6 inline-block text-sm font-medium transition-colors hover:underline"
            style={{ color: "#2d5a3d" }}
          >
            &larr; Back to justloveforest.com
          </a>
        </div>
      </div>
    );
  }

  // Check if event is in the past (use end-of-day; parse date-only strings as local to avoid UTC shift)
  const endDate = event.event_end_date || event.event_date;
  const endOfDay = endDate.includes("T") ? new Date(endDate) : new Date(endDate + "T23:59:59");
  endOfDay.setHours(23, 59, 59, 999);
  const eventOver = endOfDay < new Date();
  if (eventOver) {
    return <RegistrationClosed eventName={event.name} />;
  }

  return <RegistrationForm event={event} slug={slug} />;
}
