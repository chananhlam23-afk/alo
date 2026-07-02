"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { ArrowLeftIcon } from "@/components/ui/Icons";

const CATEGORY_LABELS: Record<string, string> = {
  TIN_TUC:    "Tin tức",
  KHUYEN_MAI: "Khuyến mãi",
  HUONG_DAN:  "Hướng dẫn",
  CAU_CHUYEN: "Câu chuyện",
  THI_TRUONG: "Thị trường",
};

type BlogPostDetail = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  readTime: number;
  viewCount: number;
  publishedAt: string | null;
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get<{ post: BlogPostDetail }>(`/public/blog/${slug}`)
      .then((r) => setPost(r.data.post))
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được bài viết"))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div style={{ background: "#020617", minHeight: "100vh", color: "#e2e8f0" }}>

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(2,6,23,.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(99,102,241,.2)",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{
          fontWeight: 800, fontSize: 18, color: "#f1f5f9", textDecoration: "none",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          🚌 <span style={{ background: "linear-gradient(90deg,#6366f1,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Thuận Chuyến</span>
        </Link>
        <Link href="/blog" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500,
        }}>
          <ArrowLeftIcon size={16} /> Tất cả bài viết
        </Link>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        {loading ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>Đang tải bài viết…</p>
        ) : error || !post ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "#f87171", marginBottom: 20 }}>{error ?? "Bài viết không tồn tại"}</p>
            <Link href="/blog" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
              borderRadius: 10, color: "#fff", textDecoration: "none", fontWeight: 600, fontSize: 14,
            }}>
              ← Về trang Blog
            </Link>
          </div>
        ) : (
          <article>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{
                padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                background: "rgba(99,102,241,.12)", color: "#818cf8",
                border: "1px solid rgba(99,102,241,.2)",
              }}>
                {CATEGORY_LABELS[post.category] ?? post.category}
              </span>
              {post.publishedAt && <span style={{ fontSize: 12, color: "#64748b" }}>{fmtDate(post.publishedAt)}</span>}
              <span style={{ fontSize: 12, color: "#475569" }}>· {post.readTime} phút đọc</span>
              <span style={{ fontSize: 12, color: "#475569" }}>· {post.viewCount} lượt xem</span>
            </div>

            <h1 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, lineHeight: 1.2, color: "#f1f5f9", marginBottom: 16 }}>
              {post.title}
            </h1>

            <p style={{ color: "#94a3b8", fontSize: 17, lineHeight: 1.7, marginBottom: 28 }}>
              {post.summary}
            </p>

            {post.coverImage && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 32 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt={post.title} style={{ width: "100%", display: "block" }} />
              </div>
            )}

            <div style={{ color: "#cbd5e1", fontSize: 16, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {post.content}
            </div>

            {post.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 36, paddingTop: 24, borderTop: "1px solid rgba(99,102,241,.15)" }}>
                {post.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: "4px 12px", borderRadius: 99, fontSize: 12,
                    background: "rgba(255,255,255,.04)", color: "#94a3b8",
                    border: "1px solid rgba(99,102,241,.15)",
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
