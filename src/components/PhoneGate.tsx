"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api/client";
import { PhoneIcon } from "@/components/ui/Icons";

/**
 * Cổng onboarding số điện thoại.
 *
 * Sau khi đăng nhập (Google/email OTP...), tài khoản chưa có SĐT sẽ bị chặn
 * bằng một lớp phủ toàn màn hình, BẮT nhập số điện thoại trước khi dùng app.
 * Số được lưu thẳng (chưa xác thực OTP) qua PATCH /me; sau đó gọi update() để
 * làm mới session — jwt callback đọc lại phone từ DB nên cổng tự đóng.
 *
 * Gắn component này trong layout của customer & driver. Nó tự ẩn khi:
 *   - đang tải session, hoặc chưa đăng nhập, hoặc user ĐÃ có phone.
 */
export default function PhoneGate() {
  const { user, loading } = useAuth();
  const { update } = useSession();
  const [phone, setPhone]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Chỉ chặn khi đã đăng nhập và CHƯA liên kết số điện thoại.
  if (loading || !user || user.phone) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Kiểm tra sơ bộ phía client (server vẫn kiểm lại): SĐT VN 10 số, đầu 03/05/07/08/09.
    const normalized = phone.replace(/\D/g, "").replace(/^84/, "0");
    if (!/^0[35789][0-9]{8}$/.test(normalized)) {
      setError("Số điện thoại không hợp lệ. Ví dụ: 0901234567");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patch("/me", { phone: phone.trim() });
      await update();               // refresh session → user.phone có giá trị → cổng tự đóng
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(4,10,24,.72)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 420, boxShadow: "var(--shadow-lg, 0 20px 60px rgba(0,0,0,.5))" }}
      >
        <div className="card-body" style={{ padding: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
          }}>
            <PhoneIcon size={24} color="#fff" />
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Nhập số điện thoại
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 18 }}>
            Vui lòng liên kết số điện thoại để tiếp tục sử dụng ứng dụng. Số này dùng để
            liên hệ trong các chuyến đi.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                inputMode="tel"
                autoFocus
                disabled={saving}
              />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: "100%", marginTop: 4 }}>
              {saving ? "Đang lưu..." : "Xác nhận & tiếp tục"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
