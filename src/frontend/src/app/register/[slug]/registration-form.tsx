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
  Banknote,
  CreditCard,
  UserPlus,
  Minus,
  Plus,
  Tag,
} from "lucide-react";

import {
  register,
  scholarshipLinks,
  type EventPublicInfo,
  type FormTemplateField,
  type EventFormLinkResponse,
  type GuestData,
  type ScholarshipLinkValidation,
} from "@/lib/api";
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

const baseSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional(),
  donation_amount: z.string().optional(),
  payment_method: z.enum(["stripe", "cash"]).optional(),
});

type BaseFormData = z.infer<typeof baseSchema>;

// ── Dynamic Field Renderer ──────────────────────
function DynamicField({
  field,
  value,
  onChange,
  templateId,
}: {
  field: FormTemplateField;
  value: unknown;
  onChange: (val: unknown) => void;
  templateId?: string;
}) {
  switch (field.type) {
    case "text":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="rounded-xl"
          />
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="rounded-xl"
            rows={3}
          />
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            type="number"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="rounded-xl"
          />
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "date":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-xl"
          />
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "dropdown":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <Select value={(value as string) || ""} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder={field.placeholder || "Select an option..."} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).length === 0 ? (
                <SelectItem value="__no_options" disabled>No options configured</SelectItem>
              ) : (
                (field.options || []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => onChange(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label className="cursor-pointer">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </Label>
              {field.help_text && <p className="text-xs text-gray-400 mt-0.5">{field.help_text}</p>}
            </div>
          </div>
        </div>
      );

    case "radio":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {(field.options || []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`${templateId || "form"}_${field.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="w-4 h-4 accent-[#2d5a3d]"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    case "multi_select":
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </Label>
          <div className="space-y-2">
            {(field.options || []).map((opt) => {
              const selected = Array.isArray(value) ? value : [];
              const isChecked = selected.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter((v: string) => v !== opt));
                      }
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              );
            })}
          </div>
          {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
        </div>
      );

    default:
      return null;
  }
}

// ── Waiver Section ──────────────────────────────
function WaiverSection({
  link,
  accepted,
  onAcceptChange,
}: {
  link: EventFormLinkResponse;
  accepted: boolean;
  onAcceptChange: (v: boolean) => void;
}) {
  const template = link.form_template;
  return (
    <div className="space-y-4">
      <h2
        className="text-lg font-bold"
        style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
      >
        {template.name}
      </h2>
      {template.description && (
        <p className="text-sm text-gray-500">{template.description}</p>
      )}
      {/* Render any informational fields in the waiver template */}
      {template.fields
        .filter((f) => f.type !== "checkbox")
        .map((field) => (
          <div key={field.id} className="text-sm text-gray-600">
            <p className="font-medium">{field.label}</p>
            {field.help_text && <p className="text-xs text-gray-400">{field.help_text}</p>}
          </div>
        ))}
      {/* Waiver acceptance checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={accepted}
          onCheckedChange={(checked) => onAcceptChange(checked === true)}
          className="mt-0.5"
          style={
            accepted
              ? ({ background: "#2d5a3d", borderColor: "#2d5a3d" } as React.CSSProperties)
              : undefined
          }
        />
        <div className="space-y-1">
          <Label className="cursor-pointer leading-snug">
            I accept the {template.name} <span className="text-red-400">*</span>
          </Label>
          {template.fields
            .filter((f) => f.type === "checkbox")
            .map((f) => (
              <p key={f.id} className="text-xs text-gray-400">{f.help_text || f.label}</p>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Guest Form Section ──────────────────────────
interface GuestFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dietary_restrictions: string;
  accommodation_type: string;
  dynamicData: Record<string, Record<string, unknown>>;
  waiverAcceptances: Record<string, boolean>;
  basicWaiverAccepted: boolean;
}

function createEmptyGuest(): GuestFormState {
  return {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    dietary_restrictions: "",
    accommodation_type: "",
    dynamicData: {},
    waiverAcceptances: {},
    basicWaiverAccepted: false,
  };
}

function GuestSection({
  index,
  guest,
  onChange,
  event,
  linkedForms,
  isPayer,
}: {
  index: number;
  guest: GuestFormState;
  onChange: (g: GuestFormState) => void;
  event: EventPublicInfo;
  linkedForms: EventFormLinkResponse[];
  isPayer: boolean;
}) {
  const regularForms = linkedForms.filter((l) => !l.is_waiver);
  const waiverForms = linkedForms.filter((l) => l.is_waiver);
  const hasFallbackWaiver = linkedForms.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus size={16} style={{ color: "#2d5a3d" }} />
        <h3
          className="text-base font-bold"
          style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
        >
          Guest {index + 1} {isPayer && "(You)"}
        </h3>
      </div>

      {/* Name & contact */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>First name <span className="text-red-400">*</span></Label>
          <Input
            value={guest.first_name}
            onChange={(e) => onChange({ ...guest, first_name: e.target.value })}
            placeholder="Jane"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Last name <span className="text-red-400">*</span></Label>
          <Input
            value={guest.last_name}
            onChange={(e) => onChange({ ...guest, last_name: e.target.value })}
            placeholder="Doe"
            className="rounded-xl"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email <span className="text-red-400">*</span></Label>
          <Input
            type="email"
            value={guest.email}
            onChange={(e) => onChange({ ...guest, email: e.target.value })}
            placeholder="jane@example.com"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            type="tel"
            value={guest.phone}
            onChange={(e) => onChange({ ...guest, phone: e.target.value })}
            placeholder="+1 (404) 555-1234"
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Dynamic forms */}
      {regularForms.map((link) => (
        <div key={link.id} className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: "#1a3a2a" }}>
            {link.form_template.name}
          </p>
          {link.form_template.fields.map((field) => (
            <DynamicField
              key={field.id}
              field={field}
              value={guest.dynamicData[link.form_template_id]?.[field.id]}
              onChange={(val) => {
                const newDynamic = {
                  ...guest.dynamicData,
                  [link.form_template_id]: {
                    ...(guest.dynamicData[link.form_template_id] || {}),
                    [field.id]: val,
                  },
                };
                onChange({ ...guest, dynamicData: newDynamic });
              }}
              templateId={`g${index}_${link.form_template_id}`}
            />
          ))}
        </div>
      ))}

      {/* Waivers */}
      {waiverForms.map((link) => (
        <WaiverSection
          key={link.id}
          link={link}
          accepted={guest.waiverAcceptances[link.id] || false}
          onAcceptChange={(v) =>
            onChange({
              ...guest,
              waiverAcceptances: { ...guest.waiverAcceptances, [link.id]: v },
            })
          }
        />
      ))}

      {hasFallbackWaiver && (
        <div className="flex items-start gap-3">
          <Checkbox
            checked={guest.basicWaiverAccepted}
            onCheckedChange={(checked) =>
              onChange({ ...guest, basicWaiverAccepted: checked === true })
            }
            className="mt-0.5"
            style={
              guest.basicWaiverAccepted
                ? ({ background: "#2d5a3d", borderColor: "#2d5a3d" } as React.CSSProperties)
                : undefined
            }
          />
          <div className="space-y-1">
            <Label className="cursor-pointer leading-snug">
              I accept the Visitor Agreement <span className="text-red-400">*</span>
            </Label>
            <p className="text-xs text-gray-400">
              By checking this box, I agree to the Just Love Forest visitor agreement,
              waiver of liability, and community guidelines.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function RegistrationForm({
  event,
  slug,
}: {
  event: EventPublicInfo;
  slug: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [freeSuccess, setFreeSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cash">("stripe");
  const [guestCount, setGuestCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scholarship code state
  const [scholarshipCode, setScholarshipCode] = useState("");
  const [scholarshipValidation, setScholarshipValidation] = useState<ScholarshipLinkValidation | null>(null);
  const [scholarshipValidating, setScholarshipValidating] = useState(false);
  const [scholarshipError, setScholarshipError] = useState<string | null>(null);

  // Composite sub-event selection is per-group, not per-guest. All guests in a
  // group get the same sub-event selections. The per-guest backend field exists
  // for future extensibility.
  const [selectedSubEvents, setSelectedSubEvents] = useState<Set<string>>(() => {
    const required = new Set<string>();
    if (event.sub_events) {
      for (const se of event.sub_events) {
        if (se.is_required) required.add(se.id);
      }
    }
    return required;
  });

  // Multi-guest state
  const [guests, setGuests] = useState<GuestFormState[]>([createEmptyGuest()]);

  // Dynamic form data for single-guest mode
  const [dynamicData, setDynamicData] = useState<Record<string, Record<string, unknown>>>({});
  const [waiverAcceptances, setWaiverAcceptances] = useState<Record<string, boolean>>({});

  const linkedForms = event.linked_forms || [];
  const regularForms = linkedForms.filter((l) => !l.is_waiver);
  const waiverForms = linkedForms.filter((l) => l.is_waiver);
  const hasLinkedForms = linkedForms.length > 0;
  const hasFallbackWaiver = !hasLinkedForms;

  const isMultiGuest = guestCount > 1;

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BaseFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      payment_method: "stripe",
    },
  });

  const [basicWaiverAccepted, setBasicWaiverAccepted] = useState(false);

  const updateDynamicField = (templateId: string, fieldId: string, value: unknown) => {
    setDynamicData((prev) => ({
      ...prev,
      [templateId]: { ...(prev[templateId] || {}), [fieldId]: value },
    }));
  };

  // Handle guest count changes
  function handleGuestCountChange(newCount: number) {
    const clamped = Math.max(1, Math.min(10, newCount));
    setGuestCount(clamped);
    setGuests((prev) => {
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, createEmptyGuest)];
      }
      return prev.slice(0, clamped);
    });
  }

  // Validate scholarship code
  async function validateScholarshipCode() {
    const code = scholarshipCode.trim();
    if (!code) {
      setScholarshipValidation(null);
      setScholarshipError(null);
      return;
    }
    setScholarshipValidating(true);
    setScholarshipError(null);
    try {
      const result = await scholarshipLinks.validate(code);
      if (result.valid) {
        // Verify the scholarship belongs to this event (if event-scoped)
        if (result.event_slug && result.event_slug !== slug) {
          setScholarshipValidation(null);
          setScholarshipError("This scholarship code is not valid for this event.");
        } else {
          setScholarshipValidation(result);
          setScholarshipError(null);
        }
      } else {
        setScholarshipValidation(null);
        setScholarshipError("Invalid or fully redeemed scholarship code");
      }
    } catch {
      setScholarshipValidation(null);
      setScholarshipError("Could not validate code. Please try again.");
    } finally {
      setScholarshipValidating(false);
    }
  }

  // Update a specific guest
  function updateGuest(index: number, guest: GuestFormState) {
    setGuests((prev) => prev.map((g, i) => (i === index ? guest : g)));
  }

  // Validate dynamic fields for a guest
  function validateGuestDynamic(guestData: GuestFormState): string | null {
    for (const link of regularForms) {
      const templateData = guestData.dynamicData[link.form_template_id] || {};
      for (const field of link.form_template.fields) {
        if (field.required) {
          const val = templateData[field.id];
          let isEmpty = false;
          if (field.type === "checkbox") isEmpty = val !== true;
          else if (field.type === "multi_select") isEmpty = !Array.isArray(val) || val.length === 0;
          else if (val === undefined || val === null) isEmpty = true;
          else if (typeof val === "string") isEmpty = !val.trim();
          if (isEmpty) return `"${field.label}" is required in ${link.form_template.name}`;
        }
      }
    }
    for (const link of waiverForms) {
      if (!guestData.waiverAcceptances[link.id]) {
        return `Waiver "${link.form_template.name}" must be accepted`;
      }
    }
    if (!hasLinkedForms && !guestData.basicWaiverAccepted) {
      return "Visitor Agreement must be accepted";
    }
    return null;
  }

  // Multi-guest submit
  async function handleMultiGuestSubmit(payerData: BaseFormData) {
    setSubmitError(null);
    setIsSubmitting(true);

    // Validate all guests
    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      if (!g.first_name.trim() || !g.last_name.trim() || !g.email.trim()) {
        setSubmitError(`Guest ${i + 1}: Name and email are required`);
        setIsSubmitting(false);
        return;
      }
      const dynamicErr = validateGuestDynamic(g);
      if (dynamicErr) {
        setSubmitError(`Guest ${i + 1}: ${dynamicErr}`);
        setIsSubmitting(false);
        return;
      }
    }

    // Build guest data
    const guestDataList: GuestData[] = guests.map((g) => ({
      first_name: g.first_name,
      last_name: g.last_name,
      email: g.email,
      phone: g.phone || undefined,
      intake_data: Object.keys(g.dynamicData).length > 0 ? g.dynamicData : undefined,
      waiver_accepted: true,
      accommodation_type: g.accommodation_type || undefined,
      dietary_restrictions: g.dietary_restrictions || undefined,
      selected_sub_event_ids: event.pricing_model === "composite" ? Array.from(selectedSubEvents) : undefined,
    }));

    const selectedMethod =
      event.allow_cash_payment && paymentMethod === "cash" ? "cash" : "stripe";
    const isFreeEvent = event.pricing_model === "free";

    try {
      const result = await register.submitGroup(slug, {
        payer: {
          first_name: payerData.first_name,
          last_name: payerData.last_name,
          email: payerData.email,
          phone: payerData.phone || undefined,
        },
        guests: guestDataList,
        payment_method: isFreeEvent ? "free" : selectedMethod,
        scholarship_code: scholarshipValidation?.valid ? scholarshipCode.trim() : undefined,
      });

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        setFreeSuccess(true);
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Single-guest submit (original flow)
  const onSubmit = async (data: BaseFormData) => {
    if (isMultiGuest) {
      return handleMultiGuestSubmit(data);
    }

    setSubmitError(null);
    setIsSubmitting(true);

    // Validate required dynamic fields
    for (const link of regularForms) {
      const templateData = dynamicData[link.form_template_id] || {};
      for (const field of link.form_template.fields) {
        if (field.required) {
          const val = templateData[field.id];
          let isEmpty = false;
          if (field.type === "checkbox") {
            isEmpty = val !== true;
          } else if (field.type === "multi_select") {
            isEmpty = !Array.isArray(val) || val.length === 0;
          } else if (val === undefined || val === null) {
            isEmpty = true;
          } else if (typeof val === "string") {
            isEmpty = !val.trim();
          }
          if (isEmpty) {
            setSubmitError(`"${field.label}" is required in ${link.form_template.name}`);
            setIsSubmitting(false);
            return;
          }
        }
      }
    }

    // Validate waiver acceptances
    for (const link of waiverForms) {
      if (!waiverAcceptances[link.id]) {
        setSubmitError(`You must accept the ${link.form_template.name}`);
        setIsSubmitting(false);
        return;
      }
    }
    if (hasFallbackWaiver && !basicWaiverAccepted) {
      setSubmitError("You must accept the Visitor Agreement to register");
      setIsSubmitting(false);
      return;
    }

    try {
      const rawDonation = data.donation_amount?.trim();
      const donationCents = rawDonation
        ? Math.round(parseFloat(rawDonation) * 100)
        : undefined;
      if (event.pricing_model === "donation" && donationCents !== undefined) {
        const minCents = event.min_donation_cents || 100;
        if (isNaN(donationCents) || donationCents < minCents) {
          setSubmitError(`Minimum contribution is ${formatCents(minCents)}`);
          setIsSubmitting(false);
          return;
        }
      }

      const selectedMethod =
        event.allow_cash_payment && paymentMethod === "cash" ? "cash" : "stripe";
      const isFreeEvent = event.pricing_model === "free";

      const result = await register.submit(slug, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || undefined,
        waiver_accepted: true,
        donation_amount_cents: donationCents,
        intake_data: Object.keys(dynamicData).length > 0 ? dynamicData : undefined,
        payment_method: isFreeEvent ? undefined : selectedMethod,
        scholarship_code: scholarshipValidation?.valid ? scholarshipCode.trim() : undefined,
        selected_sub_event_ids: event.pricing_model === "composite" ? Array.from(selectedSubEvents) : undefined,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const dateDisplay = event.event_end_date
    ? `${formatDateShort(event.event_date)} – ${formatDateShort(event.event_end_date)}`
    : formatDateLong(event.event_date);

  // Composite event: calculate total from selected sub-events
  const compositeTotal = event.pricing_model === "composite" && event.sub_events
    ? event.sub_events
        .filter((se) => selectedSubEvents.has(se.id))
        .reduce((sum, se) => sum + (se.pricing_model === "fixed" ? (se.fixed_price_cents || 0) : 0), 0)
    : 0;

  // Effective per-guest price (scholarship overrides event price)
  const effectivePrice = scholarshipValidation?.valid && scholarshipValidation.scholarship_price_cents != null
    ? scholarshipValidation.scholarship_price_cents
    : event.pricing_model === "composite"
      ? compositeTotal
      : event.fixed_price_cents;

  const priceDisplay =
    event.pricing_model === "free"
      ? "Free"
      : event.pricing_model === "donation"
        ? "Pay what you can"
        : event.pricing_model === "composite"
          ? selectedSubEvents.size > 0
            ? formatCents(compositeTotal)
            : "Select activities"
          : effectivePrice
            ? formatCents(effectivePrice)
            : "Free";

  // Calculate total for multi-guest
  const totalPrice =
    effectivePrice && guestCount > 1
      ? effectivePrice * guestCount
      : null;

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
              {isMultiGuest
                ? `All ${guestCount} guests are registered for `
                : "You're all set for "}
              <strong>{event.name}</strong>.
              {paymentMethod === "cash" && event.allow_cash_payment
                ? " Please bring your payment to the event."
                : " A confirmation email is on its way."}
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

  // Sold out
  if ((event.spots_remaining ?? Infinity) <= 0) {
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
            {/* Guest count selector */}
            <div>
              <h2
                className="mb-4 text-lg font-bold"
                style={{
                  color: "#1a3a2a",
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                How many guests?
              </h2>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleGuestCountChange(guestCount - 1)}
                  disabled={guestCount <= 1}
                  className="rounded-xl h-10 w-10"
                >
                  <Minus size={16} />
                </Button>
                <span
                  className="text-2xl font-bold w-12 text-center"
                  style={{ color: "#1a3a2a" }}
                >
                  {guestCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleGuestCountChange(guestCount + 1)}
                  disabled={
                    guestCount >= 10 ||
                    (event.spots_remaining != null && guestCount >= event.spots_remaining)
                  }
                  className="rounded-xl h-10 w-10"
                >
                  <Plus size={16} />
                </Button>
                <span className="text-sm text-gray-500">
                  {guestCount === 1 ? "Just me" : `${guestCount} guests`}
                </span>
              </div>
            </div>

            <Separator />

            {/* Payer information — always shown */}
            <div>
              <h2
                className="mb-4 text-lg font-bold"
                style={{
                  color: "#1a3a2a",
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                {isMultiGuest ? "Payer Information" : "Your Information"}
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
                    <p className="text-xs text-red-500">{errors.first_name.message}</p>
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
                    <p className="text-xs text-red-500">{errors.last_name.message}</p>
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
                    <p className="text-xs text-red-500">{errors.email.message}</p>
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

            {/* Sub-event selection for composite events */}
            {event.pricing_model === "composite" && event.sub_events && event.sub_events.length > 0 && (
              <>
                <Separator />
                <div>
                  <h2
                    className="mb-4 text-lg font-bold"
                    style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                  >
                    Select Activities
                  </h2>
                  <div className="space-y-3">
                    {event.sub_events.map((se) => {
                      const isSelected = selectedSubEvents.has(se.id);
                      const priceLabel =
                        se.pricing_model === "free"
                          ? "Free"
                          : se.pricing_model === "donation"
                            ? se.min_donation_cents
                              ? `Donation (min ${formatCents(se.min_donation_cents)})`
                              : "Donation"
                            : se.fixed_price_cents
                              ? formatCents(se.fixed_price_cents)
                              : "Free";
                      return (
                        <label
                          key={se.id}
                          className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all cursor-pointer ${
                            isSelected ? "shadow-sm" : ""
                          }`}
                          style={{
                            borderColor: isSelected ? "#2d5a3d" : "#e5e7eb",
                            background: isSelected ? "#2d5a3d08" : "transparent",
                            opacity: se.is_required ? 1 : undefined,
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={se.is_required}
                            onCheckedChange={(checked) => {
                              if (se.is_required) return;
                              setSelectedSubEvents((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(se.id);
                                else next.delete(se.id);
                                return next;
                              });
                            }}
                            className="mt-0.5"
                            style={
                              isSelected
                                ? ({ background: "#2d5a3d", borderColor: "#2d5a3d" } as React.CSSProperties)
                                : undefined
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold" style={{ color: "#1a3a2a" }}>
                                {se.name}
                                {se.is_required && (
                                  <span className="ml-2 text-xs font-normal text-gray-400">(Required)</span>
                                )}
                              </span>
                              <span className="text-sm font-medium whitespace-nowrap" style={{ color: "#2d5a3d" }}>
                                {priceLabel}
                              </span>
                            </div>
                            {se.description && (
                              <p className="text-xs text-gray-500 mt-1">{se.description}</p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {compositeTotal > 0 && (
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                      <span className="text-sm font-medium text-gray-600">
                        Selected total{isMultiGuest ? " (per guest)" : ""}
                      </span>
                      <span className="text-lg font-bold" style={{ color: "#1a3a2a" }}>
                        {formatCents(compositeTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Single-guest: show donation, forms, waivers inline */}
            {!isMultiGuest && (
              <>
                {/* Donation amount for pay-what-you-want */}
                {event.pricing_model === "donation" && (
                  <>
                    <Separator />
                    <div>
                      <h2
                        className="mb-4 text-lg font-bold"
                        style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                      >
                        Your Contribution
                      </h2>
                      <div className="space-y-2">
                        <Label htmlFor="donation_amount">Amount (USD)</Label>
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
                    </div>
                  </>
                )}

                {/* Dynamic form sections — regular (non-waiver) linked forms */}
                {regularForms.map((link) => (
                  <div key={link.id}>
                    <Separator />
                    <div className="pt-6">
                      <h2
                        className="mb-4 text-lg font-bold"
                        style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                      >
                        {link.form_template.name}
                      </h2>
                      {link.form_template.description && (
                        <p className="text-sm text-gray-500 mb-4">{link.form_template.description}</p>
                      )}
                      <div className="space-y-4">
                        {link.form_template.fields.map((field) => (
                          <DynamicField
                            key={field.id}
                            field={field}
                            value={dynamicData[link.form_template_id]?.[field.id]}
                            onChange={(val) =>
                              updateDynamicField(link.form_template_id, field.id, val)
                            }
                            templateId={link.form_template_id}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Multi-guest: per-guest sections */}
            {isMultiGuest && (
              <>
                <Separator />
                <div className="space-y-6">
                  {guests.map((guest, i) => (
                    <div key={i}>
                      {i > 0 && <Separator className="mb-6" />}
                      <GuestSection
                        index={i}
                        guest={guest}
                        onChange={(g) => updateGuest(i, g)}
                        event={event}
                        linkedForms={linkedForms}
                        isPayer={i === 0}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Scholarship code */}
            {event.pricing_model !== "free" && (
              <>
                <Separator />
                <div>
                  <h2
                    className="mb-4 text-lg font-bold"
                    style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                  >
                    Scholarship Code
                  </h2>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <Input
                        value={scholarshipCode}
                        onChange={(e) => {
                          setScholarshipCode(e.target.value);
                          if (!e.target.value.trim()) {
                            setScholarshipValidation(null);
                            setScholarshipError(null);
                          }
                        }}
                        placeholder="Enter code (optional)"
                        className="rounded-xl pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={validateScholarshipCode}
                      disabled={!scholarshipCode.trim() || scholarshipValidating}
                      className="rounded-xl"
                    >
                      {scholarshipValidating ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                  {scholarshipValidation?.valid && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm text-green-700">
                        Scholarship applied — {formatCents(scholarshipValidation.scholarship_price_cents!)} per guest
                      </span>
                    </div>
                  )}
                  {scholarshipError && (
                    <p className="mt-2 text-sm text-red-500">{scholarshipError}</p>
                  )}
                </div>
              </>
            )}

            {/* Payment method selector */}
            {event.allow_cash_payment && event.pricing_model !== "free" && (
              <>
                <Separator />
                <div>
                  <h2
                    className="mb-4 text-lg font-bold"
                    style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                  >
                    Payment Method
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("stripe")}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                        paymentMethod === "stripe" ? "shadow-sm" : ""
                      }`}
                      style={{
                        borderColor: paymentMethod === "stripe" ? "#2d5a3d" : "#e5e7eb",
                        background: paymentMethod === "stripe" ? "#2d5a3d08" : "transparent",
                      }}
                    >
                      <CreditCard
                        size={20}
                        style={{ color: paymentMethod === "stripe" ? "#2d5a3d" : "#9ca3af" }}
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: "#1a3a2a" }}>
                          Pay Online
                        </p>
                        <p className="text-xs text-gray-400">
                          Secure checkout via Stripe
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                        paymentMethod === "cash" ? "shadow-sm" : ""
                      }`}
                      style={{
                        borderColor: paymentMethod === "cash" ? "#8b6f47" : "#e5e7eb",
                        background: paymentMethod === "cash" ? "#8b6f4708" : "transparent",
                      }}
                    >
                      <Banknote
                        size={20}
                        style={{ color: paymentMethod === "cash" ? "#8b6f47" : "#9ca3af" }}
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: "#1a3a2a" }}>
                          Pay in Person
                        </p>
                        <p className="text-xs text-gray-400">
                          Cash or card at the event
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Single-guest waivers */}
            {!isMultiGuest && (
              <>
                <Separator />

                {/* Waiver forms from linked templates */}
                {waiverForms.map((link) => (
                  <div key={link.id}>
                    <WaiverSection
                      link={link}
                      accepted={waiverAcceptances[link.id] || false}
                      onAcceptChange={(v) =>
                        setWaiverAcceptances((prev) => ({ ...prev, [link.id]: v }))
                      }
                    />
                    <Separator className="mt-6" />
                  </div>
                ))}

                {/* Fallback basic waiver when no waiver templates are linked */}
                {hasFallbackWaiver && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="waiver_accepted"
                        checked={basicWaiverAccepted}
                        onCheckedChange={(checked) => setBasicWaiverAccepted(checked === true)}
                        className="mt-0.5"
                        style={
                          basicWaiverAccepted
                            ? ({ background: "#2d5a3d", borderColor: "#2d5a3d" } as React.CSSProperties)
                            : undefined
                        }
                      />
                      <div className="space-y-1">
                        <Label htmlFor="waiver_accepted" className="cursor-pointer leading-snug">
                          I accept the Visitor Agreement{" "}
                          <span className="text-red-400">*</span>
                        </Label>
                        <p className="text-xs text-gray-400">
                          By checking this box, I agree to the Just Love Forest visitor
                          agreement, waiver of liability, and community guidelines. I
                          understand this is a nature sanctuary and agree to respect the
                          land and all living beings.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Total price for multi-guest */}
            {totalPrice && isMultiGuest && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Total ({guestCount} guests × {formatCents(effectivePrice!)})
                  </span>
                  <span
                    className="text-xl font-bold"
                    style={{ color: "#1a3a2a", fontFamily: "'DM Serif Display', serif" }}
                  >
                    {formatCents(totalPrice)}
                  </span>
                </div>
              </>
            )}

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
              ) : paymentMethod === "cash" && event.allow_cash_payment ? (
                isMultiGuest
                  ? `Register ${guestCount} Guests — Pay at Event`
                  : "Register — Pay at Event"
              ) : isMultiGuest ? (
                `Continue to Payment (${guestCount} guests)`
              ) : (
                "Continue to Payment"
              )}
            </Button>

            {event.pricing_model !== "free" && paymentMethod !== "cash" && (
              <p className="text-center text-xs text-gray-400">
                You&apos;ll be redirected to Stripe for secure payment
              </p>
            )}
            {paymentMethod === "cash" && event.allow_cash_payment && (
              <p className="text-center text-xs text-gray-400">
                Your spot{isMultiGuest ? "s" : ""} will be reserved. Please bring payment to the event.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
