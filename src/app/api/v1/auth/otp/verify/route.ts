import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { verifyOtp } from "@/services/auth.service";
import { VerifyOtpSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = VerifyOtpSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  try {
    const tokens = await verifyOtp(parsed.data.otpId, parsed.data.code);
    return ok(tokens);
  } catch (e) {
    return Errors.unauthorized((e as Error).message);
  }
}
