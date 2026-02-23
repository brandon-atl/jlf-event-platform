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

export const PIE_COLORS = [colors.canopy, colors.sun, colors.sky, colors.ember];

export const fonts = {
  sans: "'DM Sans', sans-serif",
  display: "'DM Serif Display', serif",
} as const;
