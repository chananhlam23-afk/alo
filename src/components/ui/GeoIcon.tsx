"use client";
/**
 * GeoIcon — bộ icon dùng thư viện lucide-react (thay cho phiên bản SVG tự vẽ).
 *
 * Nhẹ, nét, theme-aware (màu lấy từ biến CSS --brand-*), nhất quán với hệ icon
 * còn lại của dự án. Giữ nguyên API cũ: <GeoIcon type size className style />.
 */
import type { CSSProperties } from "react";
import {
  Route,
  RadioTower,
  CreditCard,
  Bell,
  Repeat,
  Package,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type GeoIconType =
  | "route" | "realtime" | "payment" | "notification" | "backhaul" | "cargo" | "ai";

interface GeoIconProps {
  type: GeoIconType;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

// Map type → icon lucide tương ứng.
const ICONS: Record<GeoIconType, LucideIcon> = {
  route:        Route,
  realtime:     RadioTower,
  payment:      CreditCard,
  notification: Bell,
  backhaul:     Repeat,
  cargo:        Package,
  ai:           Sparkles,
};

// Màu theo type — dùng một tông, lấy từ design tokens nên tự đổi theo theme.
const COLORS: Record<GeoIconType, string> = {
  route:        "var(--brand-primary)",
  realtime:     "var(--brand-secondary)",
  payment:      "var(--brand-emerald)",
  notification: "var(--brand-pink)",
  backhaul:     "var(--brand-amber)",
  cargo:        "var(--brand-violet)",
  ai:           "var(--brand-secondary)",
};

export default function GeoIcon({ type, size = 56, className, style }: GeoIconProps) {
  const Icon = ICONS[type];
  return (
    <Icon
      size={size}
      color={COLORS[type]}
      strokeWidth={1.7}
      aria-hidden="true"
      className={className}
      style={{ display: "block", ...style }}
    />
  );
}
