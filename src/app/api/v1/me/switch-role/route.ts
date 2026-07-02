import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { updateUser } from "@/repositories/user.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";
import { SwitchRoleSchema } from "@/validators/auth.validator";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = SwitchRoleSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  // Chỉ cho chuyển sang vai trò DRIVER khi đã có hồ sơ tài xế được duyệt KYC.
  if (parsed.data.role === "DRIVER") {
    const driver = await findDriverByUserId(auth.payload.userId);
    if (!driver || driver.verificationStatus !== "APPROVED") {
      return Errors.kycPending(
        "Bạn cần hoàn tất và được duyệt KYC trước khi chuyển sang vai trò Tài xế",
      );
    }
  }

  const user = await updateUser(auth.payload.userId, { role: parsed.data.role });
  return ok({ user });
}

// App: ProfileScreen._switchRole → PATCH /me/switch-role with an EMPTY body,
// expecting the server to toggle CUSTOMER <-> DRIVER.
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const target = auth.payload.role === "DRIVER" ? "CUSTOMER" : "DRIVER";

  // Switching INTO driver requires an approved KYC profile.
  if (target === "DRIVER") {
    const driver = await findDriverByUserId(auth.payload.userId);
    if (!driver || driver.verificationStatus !== "APPROVED") {
      return Errors.kycPending(
        "Bạn cần hoàn tất và được duyệt KYC trước khi chuyển sang vai trò Tài xế",
      );
    }
  }

  const user = await updateUser(auth.payload.userId, { role: target });
  return ok({ user });
}
