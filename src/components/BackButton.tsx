"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Nút "Trở về" dùng chung.
 * - Mặc định: quay lại trang trước (router.back()); nếu không có lịch sử → về `fallback`.
 * - Truyền `href` để luôn điều hướng tới một trang cụ thể (vd danh sách cha).
 */
export default function BackButton({
  href,
  label = "Trở về",
  fallback = "/",
  style,
}: {
  href?: string;
  label?: string;
  fallback?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();

  const onClick = () => {
    if (href) { router.push(href); return; }
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 13px", borderRadius: 9, cursor: "pointer",
        background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
        color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
        transition: "all .15s", fontFamily: "inherit",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-medium)";
        e.currentTarget.style.color = "var(--text-primary)";
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.background = "var(--bg-overlay)";
      }}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
