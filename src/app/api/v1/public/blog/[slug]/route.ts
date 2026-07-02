import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ slug: string }> };

const ParamsSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/i),
});

export async function GET(_req: NextRequest, { params }: Ctx) {
  const parsed = ParamsSchema.safeParse(await params);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);
  const { slug } = parsed.data;

  const post = await prisma.blogPost.findUnique({
    where: { slug, status: "PUBLISHED" },
  });
  if (!post) return Errors.notFound("Bài viết không tồn tại");

  // Increment view count (fire-and-forget)
  prisma.blogPost.update({ where: { slug }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return NextResponse.json(
    { success: true, data: { post } },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
  );
}
