import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { upsertDevice } from "@/repositories/user.repository";
import { RegisterDeviceSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = RegisterDeviceSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const device = await upsertDevice(
    auth.payload.userId,
    parsed.data.platform,
    parsed.data.fcmToken,
  );
  return ok({ device });
}
