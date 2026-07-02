import type { NextRequest } from "next/server";

// ─── Bot / Scanner detection ──────────────────────────────────────────────────

/**
 * User-Agent substrings that indicate known vulnerability scanners or generic
 * scripting clients that are almost never legitimate browsers.
 */
const KNOWN_BOT_PATTERNS: RegExp[] = [
  /sqlmap/i,
  /nikto/i,
  /\bnmap\b/i,
  /masscan/i,
  /zgrab/i,
  /python-requests/i,
  /go-http-client/i,
  /libwww-perl/i,
  /\bdirbuster\b/i,
  /\bgobuster\b/i,
  /\bwfuzz\b/i,
  /\bffuf\b/i,
  /nuclei/i,
  /\bscan\b.*\bbot\b/i,
  /\bburpsuite\b/i,
  /\bowasp\b/i,
  /\bmetasploit\b/i,
  /\bhavij\b/i,
  /\bacunetix\b/i,
  /\bnessus\b/i,
  /\bappscan\b/i,
  /\bwebinspect\b/i,
  /\bw3af\b/i,
  /\bvega\b/i,
  /\bzaproxy\b/i,
  /\bparos\b/i,
  /\bwebscarab\b/i,
  // curl is commonly used by scanners — blocked only when no browser context
  /^curl\//i,
];

/**
 * Returns true if the User-Agent matches a known scanner or attack tool.
 */
export function isKnownBot(userAgent: string): boolean {
  if (!userAgent) return false;
  return KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

// ─── Suspicious path detection ────────────────────────────────────────────────

/**
 * URL path fragments that indicate enumeration or exploitation attempts.
 */
const SUSPICIOUS_PATH_PATTERNS: RegExp[] = [
  /\/\.env(\b|$)/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-content/i,
  /\/wp-includes/i,
  /\/phpmyadmin/i,
  /\/pma\//i,
  /\/\.git\//i,
  /\/etc\/passwd/i,
  /\/etc\/shadow/i,
  /\/proc\//i,
  /\/admin\.php/i,
  /\/shell\.php/i,
  /\/cmd\.php/i,
  /\/webshell/i,
  /\/c99\.php/i,
  /\/r57\.php/i,
  /\/b374k/i,
  // Common shell upload targets
  /\/uploads\/.*\.php/i,
  /\/files\/.*\.php/i,
  /\/tmp\/.*\.php/i,
  // XML-RPC (WordPress)
  /\/xmlrpc\.php/i,
  // Common CMS scanners
  /\/config\.php/i,
  /\/setup\.php/i,
  /\/install\.php/i,
  // Path traversal attempts
  /\.\.[/\\]/,
  /%2e%2e/i,
  // SQL injection hints in path
  /union.*select/i,
  /select.*from/i,
  // XSS hints in path
  /<script/i,
  /javascript:/i,
  // SSRF hints
  /169\.254\.169\.254/, // AWS metadata
];

/**
 * Returns true if the path looks like a scan or exploit attempt.
 */
export function isSuspiciousPath(pathname: string): boolean {
  if (!pathname) return false;
  return SUSPICIOUS_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

// ─── Threat scoring ───────────────────────────────────────────────────────────

/**
 * Scores a request from 0 (clean) to 100 (highly suspicious).
 * Combine signals to decide whether to block or log.
 */
export function threatScore(req: NextRequest): number {
  let score = 0;
  const ua = req.headers.get("user-agent") ?? "";
  const { pathname, search } = req.nextUrl;
  const fullPath = pathname + search;

  // Known scanner UA is a strong signal
  if (isKnownBot(ua)) score += 60;

  // Suspicious path
  if (isSuspiciousPath(pathname)) score += 40;

  // No User-Agent is unusual for a real browser
  if (!ua) score += 15;

  // Very short or blank UA (bots often send placeholder strings)
  if (ua && ua.length < 10) score += 10;

  // SQL injection patterns in query string
  if (/union.*select|select.*from|' ?or ?'|--|;drop/i.test(search)) score += 35;

  // XSS patterns in query string
  if (/<script|javascript:|onerror=|onload=/i.test(search)) score += 35;

  // Path traversal in query string
  if (/\.\.[/\\]|%2e%2e/i.test(fullPath)) score += 30;

  // Suspicious referer (or missing referer on a form POST)
  const referer = req.headers.get("referer");
  if (req.method === "POST" && !referer) score += 5;

  // Overly aggressive accept headers (scanners often send */* only)
  const accept = req.headers.get("accept");
  if (accept === "*/*") score += 5;

  return Math.min(score, 100);
}
