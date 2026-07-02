import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { HandleReportSchema } from "@/validators/admin.validator";
import { updateReport } from "@/repositories/pricing.repository";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = HandleReportSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const report = await updateReport(params.id, {
    status: parsed.data.status,
    adminNote: parsed.data.adminNote,
    resolvedAt: ["RESOLVED", "DISMISSED"].includes(parsed.data.status) ? new Date() : undefined,
  });

  return ok({ report });
}
