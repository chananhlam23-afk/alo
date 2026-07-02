import type { NextRequest } from "next/server";

/**
 * Extracts the real client IP address from common proxy headers.
 * Priority: Cloudflare > nginx > standard proxy > fallback
 */
export function getClientIp(req: NextRequest): string {
  // Cloudflare sets this header with the real visitor IP
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp && isValidIp(cfConnectingIp.trim())) {
    return cfConnectingIp.trim();
  }

  // nginx reverse proxy
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp && isValidIp(xRealIp.trim())) {
    return xRealIp.trim();
  }

  // Standard proxy header — may contain a comma-separated list; take the first
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0].trim();
    if (first && isValidIp(first)) {
      return first;
    }
  }

  // Next.js 14 provides the connection IP via headers in some environments
  const xForwardedHost = req.headers.get("x-forwarded-host");
  if (xForwardedHost && isValidIp(xForwardedHost.trim())) {
    return xForwardedHost.trim();
  }

  return "127.0.0.1";
}

/**
 * Basic IP address validation (IPv4 and IPv6).
 */
function isValidIp(ip: string): boolean {
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified, handles most common patterns)
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || (ipv6.test(ip) && ip.includes(":"));
}
