"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatIcon, CarIcon } from "@/components/ui/Icons";

const ChatWindow = dynamic(() => import("@/components/ChatWindow"), { ssr: false });

interface Conversation {
  tripId: string;
  tripStatus: string;
  isDriver: boolean;
  otherUser: { id?: string; fullName: string | null; avatarUrl?: string | null } | null;
  lastMessage: {
    id: string; content: string; type: string;
    createdAt: string; senderId: string;
    sender: { fullName: string | null };
  } | null;
  unreadCount: number;
  pickup?: string;
  dropoff?: string;
}

const TRIP_STATUS: Record<string, string> = {
  PENDING:   "Chờ khởi hành",
  ONGOING:   "Đang di chuyển",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

function Avatar({ name, url, size = 44 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const init = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>{init}</div>
  );
}

export default function CustomerMessagesPage() {
  const { user } = useAuth();
  const [convs,    setConvs]    = useState<Conversation[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ conversations: Conversation[] }>("/messages/conversations")
      .then((r) => setConvs(r.data.conversations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = convs.find((c) => c.tripId === activeId);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <ChatIcon size={22} color="var(--brand-violet)"/> Tin nhắn
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: convs.length > 0 ? "320px 1fr" : "1fr", gap: 16, alignItems: "start" }}>
        {/* Conversations list */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden" }}>
          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Chưa có tin nhắn</div>
              <div style={{ fontSize: 13 }}>Khi bạn có chuyến đi, bạn có thể nhắn tin với tài xế tại đây.</div>
            </div>
          ) : (
            convs.map((c) => {
              const isActive = c.tripId === activeId;
              const lastText = c.lastMessage
                ? (c.lastMessage.type === "LOCATION" ? "📍 Đã chia sẻ vị trí" : c.lastMessage.content)
                : "Chưa có tin nhắn";
              const isMine = c.lastMessage?.senderId === user?.id;

              return (
                <div key={c.tripId}
                  onClick={() => setActiveId(isActive ? null : c.tripId)}
                  style={{
                    display: "flex", gap: 12, padding: "14px 16px",
                    borderBottom: "1px solid var(--border-subtle)", cursor: "pointer",
                    background: isActive ? "rgba(99,102,241,.1)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--brand-primary)" : "3px solid transparent",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar name={c.otherUser?.fullName} url={c.otherUser?.avatarUrl} size={44}/>
                    {c.unreadCount > 0 && (
                      <span style={{
                        position: "absolute", top: -2, right: -2,
                        background: "var(--danger)", color: "#fff",
                        borderRadius: "50%", width: 18, height: 18,
                        fontSize: 10, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 600, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.otherUser?.fullName ?? "Tài xế"}
                      </span>
                      {c.lastMessage && (
                        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginLeft: 6 }}>
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 12, color: c.unreadCount > 0 ? "var(--text-secondary)" : "var(--text-muted)",
                      fontWeight: c.unreadCount > 0 ? 500 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4,
                    }}>
                      {isMine ? "Bạn: " : ""}{lastText}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                        <CarIcon size={9} color="var(--text-muted)"/>
                        {TRIP_STATUS[c.tripStatus] ?? c.tripStatus}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat window */}
        {active && user ? (
          <div style={{ position: "sticky", top: 80 }}>
            <ChatWindow
              tripId={active.tripId}
              currentUserId={user.id}
              otherUser={{ fullName: active.otherUser?.fullName ?? "Tài xế", avatarUrl: active.otherUser?.avatarUrl }}
              inline
            />
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <a href={`/customer/trips/${active.tripId}`} style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>
                Xem chi tiết chuyến đi →
              </a>
            </div>
          </div>
        ) : convs.length > 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👈</div>
            <div style={{ fontSize: 14 }}>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 320px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
