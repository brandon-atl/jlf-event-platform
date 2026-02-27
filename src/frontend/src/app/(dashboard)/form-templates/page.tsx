"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileText,
  Copy,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  X,
  Eye,
  GripVertical,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  formTemplates as formTemplatesApi,
  type FormTemplateResponse,
  type FormTemplateCreate,
  type FormTemplateField,
  type FormType,
} from "@/lib/api";
import { colors, darkColors } from "@/lib/theme";
import { isDemoMode } from "@/lib/demo-data";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORM_TYPES: { value: FormType; label: string }[] = [
  { value: "intake", label: "Intake" },
  { value: "waiver", label: "Waiver" },
  { value: "accommodation", label: "Accommodation" },
  { value: "dietary", label: "Dietary" },
  { value: "travel", label: "Travel" },
  { value: "logistics", label: "Logistics" },
  { value: "health", label: "Health" },
  { value: "legal", label: "Legal" },
  { value: "custom", label: "Custom" },
];

const FIELD_TYPES: { value: FormTemplateField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text Area" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "multi_select", label: "Multi-Select" },
  { value: "radio", label: "Radio Buttons" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  accommodation: { bg: "#2d5a3d18", text: "#2d5a3d", darkBg: "#34d39920", darkText: "#34d399" },
  dietary: { bg: "#e8b84b18", text: "#8b6f47", darkBg: "#fbbf2420", darkText: "#fbbf24" },
  travel: { bg: "#5b9bd518", text: "#3b7bc0", darkBg: "#60a5fa20", darkText: "#60a5fa" },
  health: { bg: "#d4644a18", text: "#d4644a", darkBg: "#f8717120", darkText: "#f87171" },
  logistics: { bg: "#9b5ba518", text: "#9b5ba5", darkBg: "#c084fc20", darkText: "#c084fc" },
  waiver: { bg: "#d4644a18", text: "#b84a34", darkBg: "#f8717120", darkText: "#f87171" },
  legal: { bg: "#d4644a18", text: "#b84a34", darkBg: "#f8717120", darkText: "#f87171" },
  intake: { bg: "#2d5a3d18", text: "#2d5a3d", darkBg: "#34d39920", darkText: "#34d399" },
  custom: { bg: "#6b728018", text: "#6b7280", darkBg: "#94a3b820", darkText: "#94a3b8" },
};

function makeFieldId(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}_${suffix}` : `field_${Date.now()}_${suffix}`;
}

function emptyField(): FormTemplateField {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: "text",
    label: "",
    required: false,
    placeholder: "",
    help_text: "",
  };
}

// ── Live Preview Component ──────────────────────
function FieldPreview({ field, isDark }: { field: FormTemplateField; isDark: boolean }) {
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const borderColor = isDark ? darkColors.surfaceBorder : "#e5e7eb";
  const inputBg = isDark ? darkColors.cream : "#ffffff";

  const inputStyle = {
    background: inputBg,
    borderColor,
    color: textMain,
    borderWidth: 1,
    borderStyle: "solid" as const,
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: textMain }}>
        {field.label || "Untitled field"}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === "text" && (
        <div className="rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
          <span style={{ color: textMuted }}>{field.placeholder || "Enter text..."}</span>
        </div>
      )}
      {field.type === "textarea" && (
        <div className="rounded-xl px-3 py-2.5 text-sm min-h-[60px]" style={inputStyle}>
          <span style={{ color: textMuted }}>{field.placeholder || "Enter text..."}</span>
        </div>
      )}
      {field.type === "number" && (
        <div className="rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
          <span style={{ color: textMuted }}>{field.placeholder || "0"}</span>
        </div>
      )}
      {field.type === "date" && (
        <div className="rounded-xl px-3 py-2.5 text-sm" style={inputStyle}>
          <span style={{ color: textMuted }}>mm/dd/yyyy</span>
        </div>
      )}
      {field.type === "dropdown" && (
        <div className="rounded-xl px-3 py-2.5 text-sm flex items-center justify-between" style={inputStyle}>
          <span style={{ color: textMuted }}>Select an option...</span>
          <ChevronDown size={14} style={{ color: textMuted }} />
        </div>
      )}
      {field.type === "checkbox" && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border" style={{ borderColor }} />
          <span className="text-sm" style={{ color: textMain }}>
            {field.options?.[0] || field.label || "Checkbox"}
          </span>
        </div>
      )}
      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options?.length ? field.options : ["Option 1", "Option 2"]).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border" style={{ borderColor }} />
              <span className="text-sm" style={{ color: textMain }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
      {field.type === "multi_select" && (
        <div className="space-y-2">
          {(field.options?.length ? field.options : ["Option 1", "Option 2"]).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border" style={{ borderColor }} />
              <span className="text-sm" style={{ color: textMain }}>{opt}</span>
            </div>
          ))}
        </div>
      )}
      {field.help_text && (
        <p className="text-xs" style={{ color: textMuted }}>{field.help_text}</p>
      )}
    </div>
  );
}

// ── Field Editor Row ────────────────────────────
function FieldEditorRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isDark,
}: {
  field: FormTemplateField;
  index: number;
  total: number;
  onChange: (updated: FormTemplateField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isDark: boolean;
}) {
  const borderColor = isDark ? darkColors.surfaceBorder : "#e5e7eb";
  const surfaceBg = isDark ? darkColors.surfaceElevated : "#f9fafb";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const inputStyle = isDark ? { background: darkColors.cream, borderColor, color: textMain } : {};
  const needsOptions = ["dropdown", "radio", "multi_select"].includes(field.type);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: surfaceBg, borderColor }}
    >
      <div className="flex items-center gap-2">
        <GripVertical size={14} style={{ color: textMuted }} className="shrink-0" />
        <span className="text-xs font-semibold" style={{ color: textMuted }}>
          Field {index + 1}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded transition disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp size={14} style={{ color: textMuted }} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 rounded transition disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown size={14} style={{ color: textMuted }} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded transition hover:bg-red-50"
            title="Remove field"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: textMuted }}>Label</Label>
          <Input
            value={field.label}
            onChange={(e) => {
              const label = e.target.value;
              const shouldUpdateId = !field.label || field.id === makeFieldId(field.label);
              onChange({
                ...field,
                label,
                id: shouldUpdateId ? makeFieldId(label) : field.id,
              });
            }}
            placeholder="Field label"
            className="rounded-lg h-9 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: textMuted }}>Type</Label>
          <Select
            value={field.type}
            onValueChange={(v) => onChange({ ...field, type: v as FormTemplateField["type"] })}
          >
            <SelectTrigger className="rounded-lg h-9 text-sm" style={inputStyle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: textMuted }}>Placeholder</Label>
          <Input
            value={field.placeholder || ""}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder="Placeholder text"
            className="rounded-lg h-9 text-sm"
            style={inputStyle}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: textMuted }}>Help text</Label>
          <Input
            value={field.help_text || ""}
            onChange={(e) => onChange({ ...field, help_text: e.target.value })}
            placeholder="Help text shown below field"
            className="rounded-lg h-9 text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      {needsOptions && (
        <div className="space-y-1">
          <Label className="text-xs" style={{ color: textMuted }}>
            Options (comma-separated)
          </Label>
          <Input
            value={(field.options || []).join(", ")}
            onChange={(e) =>
              onChange({
                ...field,
                options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="Option 1, Option 2, Option 3"
            className="rounded-lg h-9 text-sm"
            style={inputStyle}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id={`required-${field.id}`}
          checked={field.required || false}
          onCheckedChange={(checked) => onChange({ ...field, required: checked === true })}
        />
        <Label htmlFor={`required-${field.id}`} className="text-xs cursor-pointer" style={{ color: textMuted }}>
          Required
        </Label>
      </div>
    </div>
  );
}

// ── Create/Edit Dialog ──────────────────────────
function FormTemplateDialog({
  open,
  onClose,
  template,
  isDark,
}: {
  open: boolean;
  onClose: () => void;
  template?: FormTemplateResponse;
  isDark: boolean;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!template;

  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [formType, setFormType] = useState<FormType>(template?.form_type || "custom");
  const [isDefault, setIsDefault] = useState(template?.is_default || false);
  const [fields, setFields] = useState<FormTemplateField[]>(
    template?.fields || [emptyField()]
  );
  const [showPreview, setShowPreview] = useState(false);

  // Reset state when template prop changes (fixes stale data when switching templates)
  useEffect(() => {
    setName(template?.name || "");
    setDescription(template?.description || "");
    setFormType(template?.form_type || "custom");
    setIsDefault(template?.is_default || false);
    setFields(template?.fields || [emptyField()]);
    setShowPreview(false);
  }, [template]);

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#e5e7eb";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const inputStyle = isDark ? { background: darkColors.cream, borderColor, color: textMain } : {};

  const createMutation = useMutation({
    mutationFn: (data: FormTemplateCreate) => formTemplatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Form template created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FormTemplateCreate>) =>
      formTemplatesApi.update(template!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Form template updated");
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update template"),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const hasEmptyLabel = fields.some((f) => !f.label.trim());
    if (hasEmptyLabel) {
      toast.error("All fields must have a label. Remove empty fields or add labels.");
      return;
    }
    const validFields = fields;
    const data: FormTemplateCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      form_type: formType,
      fields: validFields,
      is_default: isDefault,
    };
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const updateField = (index: number, updated: FormTemplateField) => {
    setFields((prev) => prev.map((f, i) => (i === index ? updated : f)));
  };
  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };
  const moveField = (from: number, to: number) => {
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto p-0"
        style={{ background: cardBg, borderColor }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle
            className="text-xl font-bold"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            {isEdit ? "Edit Form Template" : "Create Form Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Template Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Accommodation Preferences"
                className="rounded-xl"
                style={inputStyle}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Form Type
              </Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as FormType)}>
                <SelectTrigger className="rounded-xl" style={inputStyle}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_TYPES.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: textMuted }}>
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="rounded-xl"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="is_default" className="text-sm cursor-pointer" style={{ color: textSub }}>
              Set as default template (auto-suggested when linking forms)
            </Label>
          </div>

          <Separator style={{ background: borderColor }} />

          {/* Field editor + preview split */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: textSub }}>
              Fields ({fields.length})
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                style={isDark ? { borderColor, color: textSub } : {}}
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye size={14} />
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                style={isDark ? { borderColor, color: textSub } : {}}
                onClick={() => setFields((prev) => [...prev, emptyField()])}
              >
                <Plus size={14} />
                Add Field
              </Button>
            </div>
          </div>

          <div className={showPreview ? "grid grid-cols-2 gap-6" : ""}>
            {/* Editor column */}
            <div className="space-y-3">
              {fields.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: textMuted }}>
                  No fields yet. Click &ldquo;Add Field&rdquo; to get started.
                </p>
              )}
              {fields.map((field, i) => (
                <FieldEditorRow
                  key={field.id}
                  field={field}
                  index={i}
                  total={fields.length}
                  onChange={(updated) => updateField(i, updated)}
                  onRemove={() => removeField(i)}
                  onMoveUp={() => i > 0 && moveField(i, i - 1)}
                  onMoveDown={() => i < fields.length - 1 && moveField(i, i + 1)}
                  isDark={isDark}
                />
              ))}
            </div>

            {/* Preview column */}
            {showPreview && (
              <div
                className="rounded-xl border p-5 space-y-4 sticky top-0 self-start"
                style={{ background: cardBg, borderColor }}
              >
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: textMuted }}>
                  Live Preview
                </p>
                {fields.filter((f) => f.label.trim()).length === 0 ? (
                  <p className="text-sm py-4 text-center" style={{ color: textMuted }}>
                    Add fields with labels to see preview
                  </p>
                ) : (
                  fields
                    .filter((f) => f.label.trim())
                    .map((field) => (
                      <FieldPreview key={field.id} field={field} isDark={isDark} />
                    ))
                )}
              </div>
            )}
          </div>

          <Separator style={{ background: borderColor }} />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              style={isDark ? { borderColor, color: textSub } : {}}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl text-white font-semibold"
              style={{ background: isDark ? darkColors.canopy : colors.canopy }}
              disabled={isPending}
              onClick={handleSave}
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ───────────────────────────────────
export default function FormTemplatesPage() {
  const queryClient = useQueryClient();
  const { isDark } = useDarkMode();
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<FormTemplateResponse | undefined>();

  const cardBg = isDark ? darkColors.surface : "#ffffff";
  const borderColor = isDark ? darkColors.surfaceBorder : "#f3f4f6";
  const textMain = isDark ? darkColors.textPrimary : colors.forest;
  const textSub = isDark ? darkColors.textSecondary : "#6b7280";
  const textMuted = isDark ? darkColors.textMuted : "#9ca3af";
  const hoverBg = isDark ? darkColors.surfaceHover : "#f9fafb";

  const { data, isLoading } = useQuery({
    queryKey: ["form-templates", filterType],
    queryFn: () => {
      if (isDemoMode()) return Promise.resolve({ data: [], meta: { total: 0, page: 1, per_page: 50 } });
      return formTemplatesApi.list({
        form_type: filterType === "all" ? undefined : filterType as FormType,
        per_page: 100,
      });
    },
  });

  const templates = data?.data || [];

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => formTemplatesApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template duplicated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to duplicate"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => formTemplatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template deleted");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      if (msg.includes("linked") || msg.includes("409")) {
        toast.error("Cannot delete — this template is linked to active events");
      } else {
        toast.error(msg);
      }
    },
  });

  const openCreate = () => {
    setEditingTemplate(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: FormTemplateResponse) => {
    setEditingTemplate(t);
    setDialogOpen(true);
  };

  const handleDelete = (t: FormTemplateResponse) => {
    if (confirm(`Delete "${t.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(t.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}
          >
            Form Builder
          </h1>
          <p className="text-sm mt-1" style={{ color: textSub }}>
            Create and manage intake form templates for event registration
          </p>
        </div>
        <Button
          className="rounded-xl text-white font-semibold shadow-sm"
          style={{ background: isDark ? darkColors.canopy : colors.canopy }}
          onClick={openCreate}
        >
          <Plus size={16} />
          New Template
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ value: "all", label: "All" }, ...FORM_TYPES].map((ft) => {
          const active = filterType === ft.value;
          return (
            <button
              key={ft.value}
              onClick={() => setFilterType(ft.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={
                active
                  ? {
                      background: isDark ? darkColors.canopy : colors.canopy,
                      color: isDark ? "#000" : "#fff",
                    }
                  : {
                      background: isDark ? darkColors.surfaceElevated : "#f3f4f6",
                      color: textSub,
                    }
              }
            >
              {ft.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-5 h-40 animate-pulse"
              style={{ background: cardBg, borderColor }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div
          className="rounded-2xl border p-12 text-center"
          style={{ background: cardBg, borderColor }}
        >
          <FileText size={40} className="mx-auto mb-4" style={{ color: textMuted }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: textMain, fontFamily: "var(--font-dm-serif), serif" }}>
            {filterType === "all" ? "No form templates yet" : `No ${filterType} templates`}
          </h3>
          <p className="text-sm mb-6" style={{ color: textSub }}>
            Create reusable intake forms that can be linked to any event
          </p>
          <Button
            className="rounded-xl text-white font-semibold"
            style={{ background: isDark ? darkColors.canopy : colors.canopy }}
            onClick={openCreate}
          >
            <Plus size={16} />
            Create Your First Template
          </Button>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, idx) => {
            const typeColor = TYPE_COLORS[t.form_type] || TYPE_COLORS.custom;
            return (
              <div
                key={t.id}
                className="group rounded-2xl border p-5 transition-all duration-200 hover:shadow-md cursor-pointer animate-in slide-in-from-bottom-2 fade-in"
                style={{
                  background: cardBg,
                  borderColor,
                  animationDelay: `${idx * 40}ms`,
                  animationFillMode: "backwards",
                }}
                onClick={() => openEdit(t)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isDark ? typeColor.darkBg : typeColor.bg }}
                    >
                      <FileText size={14} style={{ color: isDark ? typeColor.darkText : typeColor.text }} />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-sm font-bold truncate"
                        style={{ color: textMain }}
                      >
                        {t.name}
                      </h3>
                    </div>
                  </div>
                  {/* Action buttons — visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateMutation.mutate(t.id);
                      }}
                      className="p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: textMuted }}
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t);
                      }}
                      className="p-1.5 rounded-lg transition hover:bg-gray-100 dark:hover:bg-gray-800"
                      style={{ color: textMuted }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {t.description && (
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: textSub }}>
                    {t.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      background: isDark ? typeColor.darkBg : typeColor.bg,
                      color: isDark ? typeColor.darkText : typeColor.text,
                    }}
                  >
                    {t.form_type}
                  </span>
                  <span className="text-[11px]" style={{ color: textMuted }}>
                    {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}
                  </span>
                  {t.is_default && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{
                        background: isDark ? "#fbbf2420" : "#e8b84b18",
                        color: isDark ? "#fbbf24" : "#8b6f47",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <FormTemplateDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingTemplate(undefined);
          }}
          template={editingTemplate}
          isDark={isDark}
        />
      )}
    </div>
  );
}
