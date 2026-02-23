import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { register } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await register.eventInfo(slug);
    return {
      title: `Registration — ${event.name} | Just Love Forest`,
      description: `Complete your registration for ${event.name} at Just Love Forest.`,
    };
  } catch {
    return { title: "Registration | Just Love Forest" };
  }
}

export default async function CancelledPage({ params }: Props) {
  const { slug } = await params;

  let eventName: string | null = null;
  try {
    const event = await register.eventInfo(slug);
    eventName = event.name;
  } catch {
    // Proceed without event name
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardContent className="py-10 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{ background: "#e8b84b18" }}
          >
            <span className="text-3xl">🌿</span>
          </div>

          <h1
            className="mb-2 text-2xl font-bold sm:text-3xl"
            style={{
              color: "#1a3a2a",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Registration Not Completed
          </h1>

          <p className="mx-auto mt-3 max-w-md text-gray-500">
            No worries — your registration
            {eventName ? (
              <>
                {" "}
                for <strong>{eventName}</strong>
              </>
            ) : null}{" "}
            wasn&apos;t finalized. No payment has been charged.
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            If you&apos;d like to complete your registration, you can try
            again anytime. Your spot will be held as long as availability
            allows.
          </p>

          <Separator className="mx-auto my-8 max-w-xs" />

          <div className="flex flex-col items-center gap-3">
            <Button
              asChild
              className="h-11 rounded-xl px-8 font-semibold shadow-md transition-all hover:shadow-lg"
              style={{ background: "#2d5a3d" }}
            >
              <Link href={`/register/${slug}`}>
                <ArrowLeft size={16} />
                Try Again
              </Link>
            </Button>

            <Link
              href="https://justloveforest.com"
              className="text-sm text-gray-400 transition-colors hover:text-gray-600 hover:underline"
            >
              Or return to justloveforest.com
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
