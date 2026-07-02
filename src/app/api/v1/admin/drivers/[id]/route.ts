import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { findDriverById } from "@/repositories/driver.repository";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const driver = await findDriverById(params.id);
  if (!driver) return Errors.notFound();

  return ok({ driver });
}
