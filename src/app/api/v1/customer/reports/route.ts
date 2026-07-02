import { NextRequest } from "next/server";
import { created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateReportSchema } from "@/validators/customer.validator";
import { createReport } from "@/repositories/pricing.repository";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const report = await createReport({
    reporter: { connect: { id: auth.payload.userId } },
    reportedUser: { connect: { id: parsed.data.reportedDriverId } },
    tripId: parsed.data.tripId,
    reason: parsed.data.reason,
    description: parsed.data.description,
    evidenceUrls: parsed.data.evidenceUrls,
  });

  return created({ report });
}
