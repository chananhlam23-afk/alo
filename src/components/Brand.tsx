import Link from "next/link";

/**
 * Logo + wordmark "Thuận Chuyến" với hiệu ứng neon.
 * Dùng chung cho header customer/driver/admin.
 */
export default function Brand({
  size = 42,
  fontSize = 20,
  subtitle,
  href = "/",
}: {
  size?: number;
  fontSize?: number;
  subtitle?: string;
  href?: string;
}) {
  return (
    <Link href={href} className="brand" aria-label="Thuận Chuyến">
      <span className="brand-logo" style={{ width: size, height: size }}>
        <img
          src="/logo.png"
          alt="Thuận Chuyến"
          style={{ width: size - 6, height: size - 6, borderRadius: 9, objectFit: "cover" }}
        />
      </span>
      <span className="brand-copy">
        <span className="brand-name" style={{ fontSize }}>Thuận Chuyến</span>
        {subtitle && <span className="brand-sub">{subtitle}</span>}
      </span>
    </Link>
  );
}
