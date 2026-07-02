-- Landing page theme / design tokens (colors, gradient, radius).
-- Stored as JSONB; shape = ThemeConfig in src/types/landing.ts.
ALTER TABLE "landing_configs" ADD COLUMN "theme" JSONB NOT NULL DEFAULT '{}';
