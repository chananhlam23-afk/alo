import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Errors } from "@/lib/api/response";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).catch(6),
  category: z.string().trim().max(60).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);
    const { limit, category } = parsed.data;

    const posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        ...(category ? { category } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true, slug: true, title: true, summary: true,
        coverImage: true, category: true, tags: true,
        readTime: true, viewCount: true, publishedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, data: { posts } },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("[public/blog]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: String(err) } },
      { status: 500 },
    );
  }
}
