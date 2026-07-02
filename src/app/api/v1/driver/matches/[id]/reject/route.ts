import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import {
  findMatchById,
  updateMatchStatus,
} from "@/repositories/trip-request.repository";
import { findDriverByUserId } from "@/repositories/driver.repository";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const driver = await findDriverByUserId(auth.payload.userId);
  if (!driver) return Errors.forbidden();

  const match = await findMatchById(params.id);
  if (!match) return Errors.notFound();
  if (match.driverProfileId !== driver.id) return Errors.forbidden();
  if (match.status !== "OFFERED") return Errors.validation("Chỉ có thể từ chối lời mời chưa xử lý");

  await updateMatchStatus(params.id, "REJECTED");
  return ok({ rejected: true });
}
