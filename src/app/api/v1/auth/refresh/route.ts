import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { refreshTokenPair } from "@/services/auth.service";
import { RefreshTokenSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = RefreshTokenSchema.safeParse(body);
  if (!parsed.success) return Errors.validation("refreshToken là bắt buộc");

  try {
    const tokens = await refreshTokenPair(parsed.data.refreshToken);
    return ok(tokens);
  } catch (e) {
    return Errors.unauthorized((e as Error).message);
  }
}
