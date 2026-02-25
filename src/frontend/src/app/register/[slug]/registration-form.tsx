"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Users,
  DollarSign,
  Loader2,
  CheckCircle,
} from "lucide-react";

import { register, type EventPublicInfo } from "@/lib/api";
import { formatCents, formatDateLong, formatDateShort } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registrationSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional(),
  accommodation_type: z.string().optional(),
  dietary_restrictions: z.string().optional(),
  donation_amount: z.string().optional(),
  waiver_accepted: z.literal(true, {
    error: "You must accept the visitor agreement to register",
  }),
  questions_for_team: z.string().optional(),
  how_did_you_hear: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const ACCOMMODATION_OPTIONS = [
  { value: "bell_tent", label: "Bell Tent" },
  { value: "nylon_tent", label: "Nylon Tent" },
  { value: "self_camping", label: "Self-Camping (bring your own)" },
  { value: "yurt_shared", label: "Yurt (shared)" },
  { value: "none", label: "No accommodation needed" },
];

export function RegistrationForm({
  event,
  slug,
}: {
  event: EventPublicInfo;
  slug: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [freeSuccess, setFreeSuccess] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      accommodation_type: undefined,
      dietary_restrictions: "",
      waiver_accepted: undefined as unknown as true,
      questions_for_team: "",
      how_did_you_hear: "",
    },
  });

  const waiverAccepted = watch("waiver_accepted");

  const onSubmit = async (data: RegistrationFormData) => {
    setSubmitError(null);
    try {
      const rawDonation = data.donation_amount?.trim();
      const donationCents = rawDonation
        ? Math.round(parseFloat(rawDonation) * 100)
        : undefined;
      // Validate donation minimum client-side
      if (event.pricing_model === "donation" && donationCents !== undefined) {
        const minCents = event.min_donation_cents || 100;
        if (isNaN(donationCents) || donationCents < minCents) {
          setSubmitError(`Minimum contribution is ${formatCents(minCents)}`);
          return;
        }
      }
      const result = await register.submit(slug, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || undefined,
        accommodation_type: data.accommodation_type || undefined,
        dietary_restrictions: data.dietary_restrictions || undefined,
        waiver_accepted: true,
        donation_amount_cents: donationCents,
        intake_data: {
          ...(data.questions_for_team
            ? { questions_for_team: data.questions_for_team }
            : {}),
          ...(data.how_did_you_hear
            ? { how_did_you_hear: data.how_did_you_hear }
            : {}),
        },
      });

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setFreeSuccess(true);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setSubmitError(message);
    }
  };

  const dateDisplay = event.event_end_date
    ? `${formatDateShort(event.event_date)} – ${formatDateShort(event.event_end_date)}`
    : formatDateLong(event.event_date);

  const priceDisplay =
    event.pricing_model === "free"
      ? "Free"
      : event.pricing_model === "donation"
        ? "Pay what you can"
        : event.fixed_price_cents
          ? formatCents(event.fixed_price_cents)
          : "Free";

  // Free event success state
  if (freeSuccess) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="py-12">
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: "#2d5a3d18" }}
            >
              <CheckCircle size={36} style={{ color: "#2d5a3d" }} />
            </div>
            <h1
              className="mb-2 text-3xl font-bold"
              style={{
                color: "#1a3a2a",
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              You&apos;re Registered!
            </h1>
            <p className="mx-auto max-w-md text-gray-500">
              You&apos;re all set for <strong>{event.name}</strong>. A
              confirmation email is on its way.
            </p>
            <Separator className="mx-auto my-6 max-w-xs" />
            <p className="text-sm text-gray-400">
              We can&apos;t wait to see you in the forest.
            </p>
            <a
              href="https://justloveforest.com"
              className="mt-6 inline-block text-sm font-medium transition-colors hover:underline"
              style={{ color: "#2d5a3d" }}
            >
              &larr; Back to justloveforest.com
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sold out state
  if (event.spots_remaining <= 0) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardContent className="py-12">
            <div className="mx-auto mb-5 text-4xl">🌲</div>
            <h1
              className="mb-2 text-3xl font-bold"
              style={{
                color: "#1a3a2a",
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Sold Out
            </h1>
            <p className="mx-auto max-w-md text-gray-500">
              <strong>{event.name}</strong> has reached capacity.
              <br />
              Please check back later or contact Just Love Forest to join the waitlist.
            </p>
            <Separator className="mx-auto my-6 max-w-xs" />
            <a
              href="https://justloveforest.com"
              className="inline-block text-sm font-medium transition-colors hover:underline"
              style={{ color: "#2d5a3d" }}
            >
              &larr; Back to justloveforest.com
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Event info header */}
      <div className="mb-6 text-center">
        <p
          className="mb-1 text-xs font-semibold tracking-widest uppercase"
          style={{ color: "#2d5a3d" }}
        >
          Registration
        </p>
        <h1
          className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
          style={{
            color: "#1a3a2a",
            fontFamily: "'DM Serif Display', serif",
          }}
        >
          {event.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} style={{ color: "#2d5a3d" }} />
            {dateDisplay}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign size={14} style={{ color: "#2d5a3d" }} />
            {priceDisplay}
          </span>
          {event.spots_remaining != null && (
            <span className="flex items-center gap-1.5">
              <Users size={14} style={{ color: "#2d5a3d" }} />
              {event.spots_remaining} spot{event.spots_remaining !== 1 ? "s" : ""}{" "}
              remaining
            </span>
          )}
        </div>
      </div>

      {/* Registration form */}
      <Card className="rounded-2xl border-gray-100 shadow-sm">
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal information */}
            <div>
              <h2
                className="mb-4 text-lg font-bold"
                style={{
                  color: "#1a3a2a",
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                Your Information
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    First name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="Jane"
                    {...registerField("first_name")}
                    aria-invalid={!!errors.first_name}
                    className="rounded-xl"
                  />
                  {errors.first_name && (
                    <p className="text-xs text-red-500">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Last name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    {...registerField("last_name")}
                    aria-invalid={!!errors.last_name}
                    className="rounded-xl"
                  />
                  {errors.last_name && (
                    <p className="text-xs text-red-500">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    {...registerField("email")}
                    aria-invalid={!!errors.email}
                    className="rounded-xl"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (404) 555-1234"
                    {...registerField("phone")}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Event-specific details */}
            <div>
              <h2
                className="mb-4 text-lg font-bold"
                style={{
                  color: "#1a3a2a",
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                Event Details
              </h2>

              <div className="space-y-4">
                {/* Donation amount for pay-what-you-want events */}
                {event.pricing_model === "donation" && (
                  <div className="space-y-2">
                    <Label htmlFor="donation_amount">
                      Your contribution (USD)
                    </Label>
                    <div className="relative">
                      <DollarSign
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <Input
                        id="donation_amount"
                        type="number"
                        step="0.01"
                        min={
                          event.min_donation_cents
                            ? (event.min_donation_cents / 100).toFixed(2)
                            : "1.00"
                        }
                        placeholder={
                          event.min_donation_cents
                            ? (event.min_donation_cents / 100).toFixed(2)
                            : "25.00"
                        }
                        {...registerField("donation_amount")}
                        className="rounded-xl pl-8"
                      />
                    </div>
                    {event.min_donation_cents && (
                      <p className="text-xs text-gray-400">
                        Suggested minimum: {formatCents(event.min_donation_cents)}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Accommodation preference</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue("accommodation_type", value)
                    }
                  >
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue placeholder="Select accommodation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOMMODATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dietary_restrictions">
                    Dietary restrictions / food preferences
                  </Label>
                  <Textarea
                    id="dietary_restrictions"
                    placeholder="e.g., vegan, gluten-free, nut allergy... (we serve plant-based meals)"
                    {...registerField("dietary_restrictions")}
                    className="rounded-xl"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional info */}
            <div>
              <h2
                className="mb-4 text-lg font-bold"
                style={{
                  color: "#1a3a2a",
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                A Little More About You
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="questions_for_team">
                    Questions for our team?
                  </Label>
                  <Textarea
                    id="questions_for_team"
                    placeholder="Anything you'd like to ask or share before the event..."
                    {...registerField("questions_for_team")}
                    className="rounded-xl"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="how_did_you_hear">
                    How did you hear about us?
                  </Label>
                  <Input
                    id="how_did_you_hear"
                    placeholder="Instagram, friend referral, Google..."
                    {...registerField("how_did_you_hear")}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Waiver */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="waiver_accepted"
                  checked={waiverAccepted === true}
                  onCheckedChange={(checked) =>
                    setValue("waiver_accepted", checked === true ? true : (undefined as unknown as true), {
                      shouldValidate: true,
                    })
                  }
                  aria-invalid={!!errors.waiver_accepted}
                  className="mt-0.5"
                  style={
                    waiverAccepted
                      ? ({ "--tw-bg-opacity": 1, background: "#2d5a3d", borderColor: "#2d5a3d" } as React.CSSProperties)
                      : undefined
                  }
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="waiver_accepted"
                    className="cursor-pointer leading-snug"
                  >
                    I accept the Visitor Agreement{" "}
                    <span className="text-red-400">*</span>
                  </Label>
                  <p className="text-xs text-gray-400">
                    By checking this box, I agree to the Just Love Forest
                    visitor agreement, waiver of liability, and community
                    guidelines. I understand this is a nature sanctuary and
                    agree to respect the land and all living beings.
                  </p>
                </div>
              </div>
              {errors.waiver_accepted && (
                <p className="text-xs text-red-500">
                  {errors.waiver_accepted.message}
                </p>
              )}
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl text-base font-semibold shadow-md transition-all hover:shadow-lg"
              style={{ background: "#2d5a3d" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : event.pricing_model === "free" ? (
                "Complete Registration"
              ) : (
                "Continue to Payment"
              )}
            </Button>

            {event.pricing_model !== "free" && (
              <p className="text-center text-xs text-gray-400">
                You&apos;ll be redirected to Stripe for secure payment
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
