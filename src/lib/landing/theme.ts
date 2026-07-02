import type { ThemeConfig } from "@/types/landing";
import { DEFAULT_THEME } from "./defaults";

/** Merge an unknown/partial theme blob (from DB JSON) with defaults so every
 *  token is always present, even for rows saved before a token was added. */
export function normalizeTheme(input: unknown): ThemeConfig {
  const t = input && typeof input === "object" ? (input as Partial<ThemeConfig>) : {};
  return { ...DEFAULT_THEME, ...t };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** hex → rgba() with the given alpha (returns the input untouched if not a 6-digit hex). */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * Build the CSS custom-property declarations for a theme (no selector wrapper).
 * Variables match the names the landing components consume; alpha/gradient/
 * radius variants are derived so the admin only edits a handful of base tokens.
 */
export function themeToCssText(input: ThemeConfig): string {
  const t = normalizeTheme(input);
  const vars: Record<string, string> = {
    "--brand-primary":      t.brandPrimary,
    "--brand-primary-dark": t.brandPrimaryDark,
    "--brand-light":        t.brandLight,
    "--brand-secondary":    t.brandSecondary,
    "--brand-violet":       t.brandViolet,
    "--brand-pink":         t.brandPink,
    "--brand-emerald":      t.brandEmerald,
    "--brand-amber":        t.brandAmber,

    "--bg-base":     t.bgBase,
    "--bg-deep":     t.bgDeep,
    "--bg-surface":  t.bgSurface,
    "--bg-overlay":  t.bgOverlay,
    "--bg-elevated": t.bgElevated,
    "--bg-glass":    withAlpha(t.bgSurface, 0.8),
    "--bg-hover":    withAlpha(t.brandPrimary, 0.08),
    "--bg-active":   withAlpha(t.brandPrimary, 0.15),

    "--text-primary":   t.textPrimary,
    "--text-secondary": t.textSecondary,
    "--text-muted":     t.textMuted,

    "--border-line":   t.borderColor,
    "--border-subtle": withAlpha(t.brandPrimary, 0.15),
    "--border-medium": withAlpha(t.brandPrimary, 0.3),
    "--border-strong": withAlpha(t.brandPrimary, 0.5),

    "--success": t.success,
    "--danger":  t.danger,
    "--warning": t.warning,
    "--info":    t.info,

    "--grad-primary": `linear-gradient(${t.gradAngle}deg, ${t.gradFrom}, ${t.gradTo})`,
    "--grad-text":    `linear-gradient(90deg, ${t.gradFrom}, ${t.gradTo})`,
    "--grad-glow":    `linear-gradient(${t.gradAngle}deg, ${withAlpha(t.gradFrom, 0.4)}, ${withAlpha(t.gradTo, 0.2)})`,

    "--radius":    `${t.radius}px`,
    "--radius-lg": `${Math.round(t.radius * 1.6)}px`,
    "--radius-xl": `${Math.round(t.radius * 2.4)}px`,
  };
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
}
