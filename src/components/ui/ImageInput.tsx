"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";

/**
 * Ô nhập ảnh dùng chung: cho phép DÁN URL trực tiếp HOẶC TẢI ẢNH TỪ MÁY.
 * - Dán link: gõ/paste vào ô text như bình thường.
 * - Tải lên: nhấn "Tải ảnh lên" → chọn file → upload lên bucket public → điền URL.
 * Luôn có preview + xử lý lỗi. URL-paste vẫn hoạt động kể cả khi Storage chưa cấu hình.
 */
export default function ImageInput({
  value,
  onChange,
  placeholder = "https://… hoặc tải ảnh từ máy",
  previewHeight = 110,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  previewHeight?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  // Ảnh mới (dán URL khác / upload xong) → cho preview hiển thị lại.
  useEffect(() => { setBroken(false); }, [value]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Vui lòng chọn tệp ảnh (JPG, PNG, WEBP, GIF)"); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Ảnh quá lớn (tối đa 10MB)"); return; }
    setErr(null);
    setUploading(true);
    try {
      const r = await api.uploadImage(file);
      onChange(r.url);
    } catch (e) {
      setErr((e as Error).message || "Tải ảnh thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
        <input
          className="form-input"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: "1 1 200px", minWidth: 0 }}
        />
        <button
          type="button"
          className="btn btn-outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          style={{ flexShrink: 0, gap: 7, whiteSpace: "nowrap" }}
        >
          {uploading ? (
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid var(--border-medium)", borderTopColor: "var(--brand-primary)",
              display: "inline-block", animation: "spin .7s linear infinite",
            }} />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
          {uploading ? "Đang tải…" : "Tải ảnh lên"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      </div>

      {err && (
        <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{err}</div>
      )}

      {value && !broken && (
        <div style={{
          marginTop: 8, borderRadius: 8, overflow: "hidden", height: previewHeight,
          background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
        }}>
          <img
            src={value}
            alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setBroken(true)}
          />
        </div>
      )}
    </div>
  );
}
