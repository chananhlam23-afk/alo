import { NextRequest } from "next/server";
import { ok, Errors } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/context";
import { UpdateBlogPostSchema } from "@/validators/admin.validator";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return Errors.notFound("Bài viết không tồn tại");

  return ok({ post });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return Errors.notFound("Bài viết không tồn tại");

  const body = await req.json().catch(() => null);
  const parsed = UpdateBlogPostSchema.safeParse(body);
  if (!parsed.success) return Errors.validation(parsed.error.errors[0].message);

  // If slug changed, check uniqueness
  if (parsed.data.slug && parsed.data.slug !== post.slug) {
    const dup = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } });
    if (dup) return Errors.conflict("Slug đã tồn tại");
  }

  const publishedAt =
    parsed.data.status === "PUBLISHED" && post.status !== "PUBLISHED"
      ? new Date()
      : parsed.data.status !== "PUBLISHED"
      ? null
      : post.publishedAt;

  const updated = await prisma.blogPost.update({
    where: { id },
    data: { ...parsed.data, publishedAt },
  });

  return ok({ post: updated });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAuth(req, "ADMIN");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return Errors.notFound("Bài viết không tồn tại");

  await prisma.blogPost.delete({ where: { id } });
  return ok({ message: "Đã xoá bài viết" });
}
