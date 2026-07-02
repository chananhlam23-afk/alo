"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatIcon } from "@/components/ui/Icons";

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

const TRIP_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Chờ khởi hành", color: "#fbbf24" },
  ONGOING:   { label: "Đang chạy",     color: "#34d399" },
  COMPLETED: { label: "Hoàn thành",    color: "#94a3b8" },
  CANCELLED: { label: "Đã hủy",        color: "#f87171" },
};

function Avatar({ name, url, size = 44 }: { name?: string | null; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  const init = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#a78bfa,#6366f1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>{init}</div>
  );
}

export default function DriverMessagesPage() {
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
  const totalUnread = convs.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
          <ChatIcon size={22} color="var(--brand-violet)"/> Tin nhắn hành khách
        </h1>
        {totalUnread > 0 && (
          <span style={{
            background: "var(--danger)", color: "#fff",
            borderRadius: 99, padding: "2px 8px",
            fontSize: 12, fontWeight: 700,
          }}>
            {totalUnread} chưa đọc
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, alignItems: "start" }} className="msg-grid">
        {/* Conversations list */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: .5 }}>
            {convs.length} cuộc trò chuyện
          </div>

          {convs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>Chưa có tin nhắn</div>
              <div style={{ fontSize: 12 }}>Hành khách sẽ nhắn tin cho bạn sau khi đặt chuyến.</div>
            </div>
          ) : (
            convs.map((c) => {
              const isActive = c.tripId === activeId;
              const st = TRIP_STATUS[c.tripStatus];
              const lastText = c.lastMessage
                ? (c.lastMessage.type === "LOCATION" ? "📍 Đã chia sẻ vị trí" : c.lastMessage.content)
                : "Chưa có tin nhắn";
              const isMine = c.lastMessage?.senderId === user?.id;

              return (
                <div key={c.tripId}
                  onClick={() => setActiveId(isActive ? null : c.tripId)}
                  style={{
                    display: "flex", gap: 10, padding: "12px 14px",
                    borderBottom: "1px solid var(--border-subtle)", cursor: "pointer",
                    background: isActive ? "rgba(167,139,250,.12)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--brand-violet)" : "3px solid transparent",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-overlay)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar name={c.otherUser?.fullName} url={c.otherUser?.avatarUrl} size={40}/>
                    {c.unreadCount > 0 && (
                      <span style={{
                        position: "absolute", top: -2, right: -2,
                        background: "var(--danger)", color: "#fff",
                        borderRadius: "50%", width: 16, height: 16,
                        fontSize: 9, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 600, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.otherUser?.fullName ?? "Hành khách"}
                      </span>
                      {st && (
                        <span style={{ fontSize: 9, color: st.color, fontWeight: 700, flexShrink: 0, marginLeft: 4, background: `${st.color}18`, padding: "1px 5px", borderRadius: 4 }}>
                          {st.label}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: c.unreadCount > 0 ? "var(--text-secondary)" : "var(--text-muted)",
                      fontWeight: c.unreadCount > 0 ? 500 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {isMine ? "Bạn: " : ""}{lastText}
                    </div>
                    {c.pickup && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📍 {c.pickup}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat window */}
        {active && user ? (
          <div style={{ position: "sticky", top: 20 }}>
            <ChatWindow
              tripId={active.tripId}
              currentUserId={user.id}
              otherUser={{ fullName: active.otherUser?.fullName ?? "Hành khách", avatarUrl: active.otherUser?.avatarUrl }}
              inline
            />
          </div>
        ) : convs.length > 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👈</div>
            <div style={{ fontSize: 13 }}>Chọn một cuộc trò chuyện để nhắn tin với hành khách</div>
          </div>
        ) : null}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .msg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
