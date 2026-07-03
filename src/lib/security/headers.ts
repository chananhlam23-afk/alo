import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Builds a Content Security Policy header value.
 * Permissive enough for the app (maps, fonts, Supabase realtime) but blocks
 * the most common injection vectors.
 */
function buildCsp(): string {
  const scriptSrc = [
    "'self'",
    // Next.js App Router chèn inline bootstrap/hydration script ở MỌI môi trường
    // (kể cả production). Thiếu 'unsafe-inline' → CSP chặn → React không hydrate
    // → trang đứng ở "Đang tải…". Vì vậy phải cho phép inline script cả prod.
    "'unsafe-inline'",
    // eval chỉ cần cho HMR/webpack runtime lúc dev.
    isProd ? "" : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" ");

  const directives: string[] = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // Allow inline styles (Tailwind, styled-jsx, maps inject inline styles)
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // Maps (Goong, OSM, CartoDB tiles, Photon) + Supabase storage + self + ảnh avatar/demo (pravatar, picsum, unsplash)
    `img-src 'self' data: blob: https://*.goong.io https://*.openstreetmap.org https://nominatim.openstreetmap.org https://*.basemaps.cartocdn.com https://*.supabase.co https://i.pravatar.cc https://picsum.photos https://fastly.picsum.photos https://images.unsplash.com https://*.googleusercontent.com https://*.gravatar.com`,
    // WebSocket for Supabase realtime; HTTPS for all geocoding/maps APIs used
    `connect-src 'self' wss://*.supabase.co https://*.supabase.co https://nominatim.openstreetmap.org https://photon.komoot.io https://rsapi.goong.io https://tile.goong.io`,
    // Map tiles may use workers with blob: URLs
    `worker-src 'self' blob:`,
    // Same-origin iframes only (admin landing live-preview embeds /login)
    `frame-src 'self'`,
    // Cho phép chính app nhúng trang của mình (admin preview); chặn site khác
    `frame-ancestors 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ];

  return directives.join("; ");
}

/**
 * Applies a comprehensive set of security headers to a NextResponse.
 * Call this in middleware for every outgoing response.
 */
export function applySecurityHeaders(res: NextResponse): NextResponse {
  // Prevent clickjacking từ site khác, nhưng cho phép admin tự nhúng preview
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  // Prevent MIME sniffing
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Legacy XSS filter (still useful for older browsers)
  res.headers.set("X-XSS-Protection", "1; mode=block");
  // Limit referrer leakage
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict dangerous browser features
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)",
  );
  // HSTS — only in production (avoid breaking localhost HTTPS)
  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  // Content Security Policy
  res.headers.set("Content-Security-Policy", buildCsp());

  return res;
}
