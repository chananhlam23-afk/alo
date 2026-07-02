"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { BlogPostSummary } from "@/types/landing";
import { DocumentIcon } from "@/components/ui/Icons";
import BackButton from "@/components/BackButton";

const CATEGORY_LABELS: Record<string, string> = {
  TIN_TUC:    "Tin tức",
  KHUYEN_MAI: "Khuyến mãi",
  HUONG_DAN:  "Hướng dẫn",
  CAU_CHUYEN: "Câu chuyện",
  THI_TRUONG: "Thị trường",
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ posts: BlogPostSummary[] }>("/public/blog?limit=20")
      .then((r) => setPosts(r.data.posts))
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được bài viết"))
      .finally(() => setLoading(false));
  }, []);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BackButton fallback="/" />
          <Link href="/" style={{
            fontWeight: 800, fontSize: 18, color: "#f1f5f9", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            🚌 <span style={{ background: "linear-gradient(90deg,#6366f1,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Thuận Chuyến</span>
          </Link>
        </div>
        <Link href="/login" style={{
          padding: "8px 18px", background: "linear-gradient(135deg,#6366f1,#4f46e5)",
          borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600,
          boxShadow: "0 0 16px rgba(99,102,241,.35)",
        }}>
          Đăng nhập →
        </Link>
      </header>

      {/* Hero */}
      <section style={{
        padding: "64px 24px 40px",
        textAlign: "center",
        background: "radial-gradient(ellipse at top,rgba(99,102,241,.12) 0%,transparent 60%)",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)",
          borderRadius: 999, padding: "5px 14px", marginBottom: 20,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22d3ee", display: "inline-block", boxShadow: "0 0 8px #22d3ee" }} />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Kiến thức & Chia sẻ</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
          Blog{" "}
          <span style={{ background: "linear-gradient(90deg,#6366f1,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Thuận Chuyến
          </span>
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
          Hướng dẫn sử dụng, mẹo di chuyển, và câu chuyện từ cộng đồng Thuận Chuyến.
        </p>
      </section>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>Đang tải bài viết…</p>
        ) : error ? (
          <p style={{ color: "#f87171", textAlign: "center", padding: "40px 0" }}>{error}</p>
        ) : posts.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>Chưa có bài viết nào.</p>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{
                  display: "block", textDecoration: "none",
                  background: "#0f172a",
                  border: "1px solid rgba(99,102,241,.1)",
                  borderRadius: 16, overflow: "hidden",
                }}
              >
                {post.coverImage ? (
                  <div style={{ height: 160, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverImage} alt={post.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div style={{
                    height: 120, background: "linear-gradient(135deg,rgba(99,102,241,.15),rgba(34,211,238,.08))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <DocumentIcon size={32} color="rgba(99,102,241,.4)" />
                  </div>
                )}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                      background: "rgba(99,102,241,.12)", color: "#818cf8",
                      border: "1px solid rgba(99,102,241,.2)",
                    }}>
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                    <span style={{ fontSize: 11, color: "#475569" }}>{post.readTime} phút đọc</span>
                  </div>
                  <h3 style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>
                    {post.title}
                  </h3>
                  <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
                    {post.summary.slice(0, 100)}{post.summary.length > 100 ? "…" : ""}
                  </p>
                  {post.publishedAt && (
                    <span style={{ fontSize: 11, color: "#334155" }}>{fmtDate(post.publishedAt)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
