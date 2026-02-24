/**
 * JLF Design Tokens — Warm Forest Palette
 * Extracted from the approved mockup (jlf-erp-final.jsx)
 */
export const colors = {
  forest: "#1a3a2a",
  canopy: "#2d5a3d",
  moss: "#4a7c5c",
  sage: "#7ba68a",
  meadow: "#a8d5b8",
  cream: "#faf8f2",
  bark: "#8b6f47",
  earth: "#c4a472",
  sun: "#e8b84b",
  ember: "#d4644a",
  sky: "#5b9bd5",
  berry: "#9b5ba5",
} as const;

/** Dark mode palette — Midnight Forest */
export const darkColors = {
  forest: "#c8e6d0",
  canopy: "#4a9e6a",
  moss: "#6bbd88",
  sage: "#92d4a8",
  meadow: "#2d5a3d",
  cream: "#0f1720",
  bark: "#c4a472",
  earth: "#dcc18e",
  sun: "#f0c860",
  ember: "#e07860",
  sky: "#7bb8e8",
  berry: "#b87ec4",
  // Dark-specific surfaces
  surface: "#161f2a",
  surfaceHover: "#1c2736",
  surfaceBorder: "#243044",
  textPrimary: "#e8ecf0",
  textSecondary: "#8899aa",
  textMuted: "#556677",
} as const;

export const PIE_COLORS = [colors.canopy, colors.sun, colors.sky, colors.ember];

export const fonts = {
  sans: "'DM Sans', sans-serif",
  display: "'DM Serif Display', serif",
} as const;
