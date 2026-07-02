import { NextRequest } from "next/server";
import { ok, created, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { CreateBlogPostSchema, ListQuerySchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const query = ListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return Errors.validation(query.error.errors[0].message);

  const { page, limit, status } = query.data;
  const where = status && status !== "ALL" ? { status: status as never } : {};

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, slug: true, title: true, summary: true,
        coverImage: true, category: true, status: true,
        tags: true, readTime: true, viewCount: true,
        publishedAt: true, createdAt: true, updatedAt: true, authorId: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return ok({ posts, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateBlogPostSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  const existing = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return Errors.conflict("Slug đã tồn tại. Chọn slug khác.");

  const post = await prisma.blogPost.create({
    data: {
      ...parsed.data,
      authorId: auth.payload.userId,
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });

  return created({ post });
}
