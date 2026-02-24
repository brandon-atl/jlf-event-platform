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

/** Dark mode palette — Midnight Forest (vibrant, high-contrast) */
export const darkColors = {
  forest: "#e8f5ee",       // Near-white with green tint — primary headings
  canopy: "#34d399",       // Vibrant emerald — accent color, buttons, active states
  moss: "#6ee7b7",         // Bright mint — links, interactive elements
  sage: "#a7f3d0",         // Light green — hover accents
  meadow: "#0d2818",       // Deep forest — subtle backgrounds
  cream: "#080c10",        // True near-black — page background
  bark: "#d4a574",         // Warm amber — avatar, warm accents
  earth: "#e8c99a",        // Bright sand
  sun: "#fbbf24",          // Vivid gold — warnings, pending badges
  ember: "#f87171",        // Bright coral — errors, alerts
  sky: "#60a5fa",          // Bright blue — info
  berry: "#c084fc",        // Vivid purple — special tags
  // Dark-specific surfaces — wider contrast gap between levels
  surface: "#111820",      // Card background — noticeably distinct from page bg
  surfaceElevated: "#182230", // Elevated cards, modals — clearly raised
  surfaceHover: "#1e2a3a", // Hover states
  surfaceBorder: "#263348", // Visible borders with slight blue tint
  textPrimary: "#f1f5f9",  // Bright white — primary text (96% white)
  textSecondary: "#94a3b8", // Clear gray — secondary text (slate-400)
  textMuted: "#64748b",    // Mid gray — tertiary text (slate-500)
} as const;

export const PIE_COLORS = [colors.canopy, colors.sun, colors.sky, colors.ember];
export const DARK_PIE_COLORS = [darkColors.canopy, darkColors.sun, darkColors.sky, darkColors.ember, darkColors.berry];

export const fonts = {
  sans: "'DM Sans', sans-serif",
  display: "'DM Serif Display', serif",
} as const;
