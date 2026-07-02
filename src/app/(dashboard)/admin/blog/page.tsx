"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import ImageInput from "@/components/ui/ImageInput";
import { PlusIcon, TrashIcon, EditIcon, XIcon } from "@/components/ui/Icons";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type BlogCategory = "TIN_TUC" | "KHUYEN_MAI" | "HUONG_DAN" | "CAU_CHUYEN" | "THI_TRUONG";
type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface BlogListItem {
  id: string; slug: string; title: string; summary: string;
  coverImage?: string | null; category: BlogCategory; status: BlogStatus;
  tags: string[]; readTime: number; viewCount: number;
  publishedAt?: string | null; createdAt: string; updatedAt: string; authorId: string;
}

interface BlogPost extends BlogListItem {
  content: string; seoTitle?: string | null; seoDesc?: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

const CATEGORIES: BlogCategory[] = ["TIN_TUC", "KHUYEN_MAI", "HUONG_DAN", "CAU_CHUYEN", "THI_TRUONG"];
const CATEGORY_LABEL: Record<BlogCategory, string> = {
  TIN_TUC: "Tin tức", KHUYEN_MAI: "Khuyến mãi", HUONG_DAN: "Hướng dẫn",
  CAU_CHUYEN: "Câu chuyện", THI_TRUONG: "Thị trường",
};
const STATUS_COLOR: Record<BlogStatus, string> = {
  DRAFT: "#fbbf24", PUBLISHED: "#22d3ee", ARCHIVED: "#6b7280",
};
const STATUS_LABEL: Record<BlogStatus, string> = {
  DRAFT: "Nháp", PUBLISHED: "Đã đăng", ARCHIVED: "Lưu trữ",
};

/* ─── Shared UI (mirrors admin/rewards) ──────────────────────────────────── */
function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color, background: color + "20", border: `1px solid ${color}50`, borderRadius: 99, padding: "2px 8px" }}>
      {label}
    </span>
  );
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 14, width: "100%", maxWidth: wide ? 760 : 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,.4)" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}>
            <XIcon size={16} />
          </button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ─── Form state ─────────────────────────────────────────────────────────── */
const emptyForm = {
  slug: "", title: "", summary: "", content: "", coverImage: "",
  tags: "", category: "TIN_TUC" as BlogCategory,
  seoTitle: "", seoDesc: "", readTime: 3, status: "DRAFT" as BlogStatus,
};
type Form = typeof emptyForm;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ posts: BlogListItem[] }>("/admin/blog")
      .then(r => setPosts(r.data.posts ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = async (id: string) => {
    try {
      const r = await api.get<{ post: BlogPost }>(`/admin/blog/${id}`);
      const p = r.data.post;
      setForm({
        slug: p.slug, title: p.title, summary: p.summary, content: p.content,
        coverImage: p.coverImage ?? "", tags: (p.tags ?? []).join(", "),
        category: p.category, seoTitle: p.seoTitle ?? "", seoDesc: p.seoDesc ?? "",
        readTime: p.readTime, status: p.status,
      });
      setEditingId(id);
      setShowModal(true);
    } catch (e) {
      alert((e as Error)?.message || "Không tải được bài viết.");
    }
  };

  const save = async () => {
    if (!form.slug || !form.title || !form.summary || !form.content) return;
    setSaving(true);
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      slug: form.slug, title: form.title, summary: form.summary, content: form.content,
      coverImage: form.coverImage || undefined,
      tags, category: form.category,
      seoTitle: form.seoTitle || undefined,
      seoDesc: form.seoDesc || undefined,
      readTime: Number(form.readTime) || 3,
      status: form.status,
    };
    try {
      if (editingId) await api.put(`/admin/blog/${editingId}`, payload);
      else await api.post("/admin/blog", payload);
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      alert((e as Error)?.message || "Không lưu được bài viết. Kiểm tra lại nội dung.");
    } finally { setSaving(false); }
  };

  const toggleStatus = async (p: BlogListItem) => {
    const newStatus: BlogStatus = p.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      await api.put(`/admin/blog/${p.id}`, { status: newStatus });
      load();
    } catch (e) {
      alert((e as Error)?.message || "Không đổi được trạng thái.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Xóa bài viết này?")) return;
    try {
      await api.del(`/admin/blog/${id}`);
      load();
    } catch (e) {
      alert((e as Error)?.message || "Không xóa được bài viết.");
    }
  };

  const filtered = filter === "ALL" ? posts : posts.filter(p => p.status === filter);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Blog & Bài viết</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Soạn thảo và xuất bản tin tức, hướng dẫn, câu chuyện</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Tổng bài viết", value: posts.length, color: "var(--brand-primary)" },
          { label: "Đã đăng", value: posts.filter(p => p.status === "PUBLISHED").length, color: "var(--brand-secondary)" },
          { label: "Nháp", value: posts.filter(p => p.status === "DRAFT").length, color: "var(--brand-amber)" },
          { label: "Lượt xem", value: posts.reduce((s, p) => s + (p.viewCount ?? 0), 0), color: "var(--brand-secondary)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={filter === f ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
            style={{ fontSize: 12, padding: "5px 12px" }}>
            {f === "ALL" ? "Tất cả" : STATUS_LABEL[f as BlogStatus]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <PlusIcon size={14} /> Viết bài
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tiêu đề</th><th>Danh mục</th><th>Đọc</th>
                <th>Lượt xem</th><th>Ngày tạo</th><th>Trạng thái</th><th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Chưa có bài viết nào</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.coverImage && (
                        <div style={{ width: 48, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--bg-overlay)" }}>
                          <img src={p.coverImage} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.title}</div>
                        <code style={{ fontSize: 11, color: "var(--text-muted)" }}>/{p.slug}</code>
                        {p.tags?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5, maxWidth: 320 }}>
                            {p.tags.slice(0, 4).map((t, i) => (
                              <span key={i} style={{ fontSize: 10, color: "var(--text-secondary)", background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: "1px 6px" }}>{t}</span>
                            ))}
                            {p.tags.length > 4 && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>+{p.tags.length - 4}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{CATEGORY_LABEL[p.category]}</span></td>
                  <td><span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.readTime} phút</span></td>
                  <td><span style={{ fontSize: 12 }}>{(p.viewCount ?? 0).toLocaleString("vi-VN")}</span></td>
                  <td><span style={{ fontSize: 12 }}>{fmtDate(p.createdAt)}</span></td>
                  <td><Badge color={STATUS_COLOR[p.status]} label={STATUS_LABEL[p.status]} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {p.status !== "ARCHIVED" && (
                        <button type="button" onClick={() => toggleStatus(p)}
                          style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 8px", fontSize: 11, color: p.status === "PUBLISHED" ? "var(--brand-amber)" : "var(--brand-secondary)", whiteSpace: "nowrap" }}>
                          {p.status === "PUBLISHED" ? "Ẩn (nháp)" : "Đăng"}
                        </button>
                      )}
                      <button type="button" onClick={() => openEdit(p.id)}
                        style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 6px", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                        <EditIcon size={13} />
                      </button>
                      <button type="button" onClick={() => remove(p.id)}
                        style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 6, cursor: "pointer", padding: "4px 6px", color: "var(--danger)", display: "flex", alignItems: "center" }}>
                        <TrashIcon size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Sửa bài viết" : "Viết bài mới"} wide>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
          <FormRow label="Tiêu đề" required>
            <input className="form-input" value={form.title} placeholder="VD: Kinh nghiệm đi ghép xe an toàn"
              onChange={e => {
                const title = e.target.value;
                setForm(f => ({ ...f, title, slug: !editingId && (f.slug === "" || f.slug === slugify(f.title)) ? slugify(title) : f.slug }));
              }} />
          </FormRow>
          <FormRow label="Slug" required hint="Chỉ gồm a-z, 0-9 và dấu gạch ngang">
            <input className="form-input" value={form.slug} placeholder="kinh-nghiem-di-ghep-xe"
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
          </FormRow>
        </div>

        <FormRow label="Tóm tắt" required hint="20–500 ký tự, hiển thị ở danh sách bài viết">
          <textarea className="form-input" value={form.summary} rows={2} placeholder="Mô tả ngắn gọn nội dung bài viết..."
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} style={{ resize: "vertical" }} />
        </FormRow>

        <FormRow label="Nội dung" required hint="Tối thiểu 50 ký tự. Hỗ trợ Markdown/HTML tuỳ giao diện hiển thị.">
          <textarea className="form-input" value={form.content} rows={10} placeholder="Nội dung chi tiết bài viết..."
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={{ resize: "vertical" }} />
        </FormRow>

        <FormRow label="Ảnh bìa">
          <ImageInput value={form.coverImage} onChange={(url) => setForm(f => ({ ...f, coverImage: url }))} previewHeight={120} />
        </FormRow>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <FormRow label="Danh mục" required>
            <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as BlogCategory }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </FormRow>
          <FormRow label="Thời gian đọc (phút)">
            <input className="form-input" type="number" min={1} max={120} value={form.readTime}
              onChange={e => setForm(f => ({ ...f, readTime: Number(e.target.value) }))} />
          </FormRow>
          <FormRow label="Trạng thái">
            <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BlogStatus }))}>
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã đăng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </FormRow>
        </div>

        <FormRow label="Thẻ (tags)" hint="Ngăn cách bằng dấu phẩy, tối đa 10 thẻ">
          <input className="form-input" value={form.tags} placeholder="an toàn, mẹo, ghép xe"
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </FormRow>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormRow label="SEO Title" hint="Tối đa 70 ký tự">
            <input className="form-input" value={form.seoTitle} placeholder="Để trống = dùng tiêu đề"
              onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} />
          </FormRow>
          <FormRow label="SEO Description" hint="Tối đa 160 ký tự">
            <input className="form-input" value={form.seoDesc} placeholder="Để trống = dùng tóm tắt"
              onChange={e => setForm(f => ({ ...f, seoDesc: e.target.value }))} />
          </FormRow>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4, position: "sticky", bottom: 0, background: "var(--bg-surface)", paddingTop: 12 }}>
          <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo bài viết"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
