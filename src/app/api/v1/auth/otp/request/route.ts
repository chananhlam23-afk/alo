import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { otpRateLimit } from "@/lib/security/rate-limit";
import { requestOtp } from "@/services/auth.service";
import { RequestOtpSchema } from "@/validators/auth.validator";
import { sanitizePhone } from "@/lib/security/sanitize";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RequestOtpSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const phone = sanitizePhone(parsed.data.phone);
  const rl = await otpRateLimit.limit(phone);
  if (!rl.success) return Errors.rateLimited();

  const result = await requestOtp(phone);
  return ok(result, 200);
}
