import { NextRequest } from "next/server";
import { created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UploadDocumentSchema } from "@/validators/driver.validator";
import { uploadDocument } from "@/services/driver.service";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = UploadDocumentSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  try {
    const doc = await uploadDocument(auth.payload.userId, parsed.data.type, parsed.data.url);
    return created({ document: doc });
  } catch (e) {
    return Errors.notFound((e as Error).message);
  }
}
