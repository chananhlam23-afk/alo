"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api/client";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface Sender {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  type: string;
  content: string;
  metadata?: { lat: number; lng: number } | null;
  createdAt: string;
  sender: Sender;
}

export interface OtherUser {
  id?: string;
  fullName: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  vehiclePlate?: string;
  vehicleType?: string;
  rating?: number;
}

interface Props {
  tripId: string;
  currentUserId: string;
  otherUser: OtherUser;
  open?: boolean;
  onClose?: () => void;
  inline?: boolean;
}

function Avatar({ name, size = 36, url }: { name?: string | null; size?: number; url?: string | null }) {
  if (url) {
    return <img src={url} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  const init = (name ?? "?").charAt(0).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#fff",
    }}>{init}</div>
  );
}

function LocationBubble({ content, metadata }: { content: string; metadata?: { lat: number; lng: number } | null }) {
  const href = metadata
    ? `https://www.google.com/maps?q=${metadata.lat},${metadata.lng}`
    : undefined;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "inherit" }}>
      <span style={{ fontSize: 22 }}>📍</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Vị trí hiện tại</div>
        <div style={{ fontSize: 11, opacity: .8 }}>{content}</div>
        {href && <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 2 }}>Xem trên bản đồ →</div>}
      </div>
    </a>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hôm qua " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) + " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatWindow({ tripId, currentUserId, otherUser, open = true, onClose, inline = false }: Props) {
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input,    setInput]        = useState("");
  const [sending,  setSending]      = useState(false);
  const [loading,  setLoading]      = useState(true);
  const [locating, setLocating]     = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  const scrollBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Load messages
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<{ messages: ChatMessage[]; currentUserId: string }>(`/messages?tripId=${tripId}`)
      .then((r) => { setMessages(r.data.messages); scrollBottom(); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tripId, open, scrollBottom]);

  // Supabase Realtime subscription (only when configured)
  useEffect(() => {
    if (!open || !isSupabaseConfigured) return;
    const supabase = createBrowserClient();
    if (!supabase) return;
    const ch = supabase.channel(`trip:${tripId}`)
      .on("broadcast", { event: "chat.message" }, ({ payload }: { payload: { message: ChatMessage } }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
        scrollBottom();
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [tripId, open, scrollBottom]);

  // Polling fallback when Supabase not configured (every 5s)
  useEffect(() => {
    if (!open || isSupabaseConfigured) return;
    const poll = setInterval(() => {
      api.get<{ messages: ChatMessage[] }>(`/messages?tripId=${tripId}`)
        .then((r) => setMessages(r.data.messages))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(poll);
  }, [tripId, open]);

  const sendText = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await api.post<{ message: ChatMessage }>("/messages", { tripId, type: "TEXT", content: text.trim() });
      setMessages((prev) => {
        if (prev.some((m) => m.id === r.data.message.id)) return prev;
        return [...prev, r.data.message];
      });
      setInput("");
      scrollBottom();
    } catch (e) {
      console.error(e);
    } finally { setSending(false); }
  };

  const sendLocation = () => {
    if (!navigator.geolocation) return alert("Thiết bị không hỗ trợ vị trí");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const r = await api.post<{ message: ChatMessage }>("/messages", {
            tripId, type: "LOCATION",
            content: address,
            metadata: { lat, lng },
          });
          setMessages((prev) => {
            if (prev.some((m) => m.id === r.data.message.id)) return prev;
            return [...prev, r.data.message];
          });
          scrollBottom();
        } catch (e) { console.error(e); }
        finally { setLocating(false); }
      },
      () => { setLocating(false); alert("Không lấy được vị trí"); },
      { timeout: 8000 },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  };

  if (!open) return null;

  const panelStyle: React.CSSProperties = inline ? {
    display: "flex", flexDirection: "column", height: 480,
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 16, overflow: "hidden",
  } : {
    position: "fixed", bottom: 80, right: 24, zIndex: 999,
    width: 360, height: 520,
    display: "flex", flexDirection: "column",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-subtle)",
    borderRadius: 16, overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,.5)",
  };

  return (
    <div style={panelStyle}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: "linear-gradient(135deg,rgba(99,102,241,.15),rgba(34,211,238,.08))",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}>
        <Avatar name={otherUser.fullName} url={otherUser.avatarUrl} size={38}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {otherUser.fullName ?? "Người dùng"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {otherUser.vehiclePlate
              ? `${otherUser.vehiclePlate} · ${otherUser.vehicleType}`
              : isSupabaseConfigured ? "Đang trực tuyến" : "Cập nhật mỗi 5 giây"}
            {otherUser.rating ? ` · ⭐ ${otherUser.rating.toFixed(1)}` : ""}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {otherUser.phone && (
            <a href={`tel:${otherUser.phone}`}
              title="Gọi điện"
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--brand-emerald)", fontSize: 16, textDecoration: "none", flexShrink: 0,
              }}>
              📞
            </a>
          )}
          <button
            title="Video call (sắp có)"
            onClick={() => alert("Tính năng gọi video đang phát triển. Vui lòng dùng gọi điện thoại.")}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--brand-primary)", fontSize: 16, cursor: "pointer", flexShrink: 0,
            }}>
            🎥
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 10,
                background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0,
              }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Bắt đầu cuộc trò chuyện với {otherUser.fullName ?? "người dùng"}
            </div>
          </div>
        ) : (
          <>
            <div style={{
              textAlign: "center", fontSize: 11, color: "var(--text-muted)",
              padding: "4px 10px", background: "var(--bg-overlay)",
              borderRadius: 99, alignSelf: "center", marginBottom: 8,
            }}>
              Cuộc trò chuyện bắt đầu
            </div>
            {messages.map((msg, i) => {
              const isMine = msg.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const showAvatar = !isMine && (i === 0 || prevMsg?.senderId !== msg.senderId);

              return (
                <div key={msg.id} style={{
                  display: "flex",
                  flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "flex-end", gap: 6,
                  marginTop: showAvatar && !isMine ? 8 : 2,
                }}>
                  {!isMine && (
                    <div style={{ width: 28, flexShrink: 0 }}>
                      {showAvatar && <Avatar name={msg.sender.fullName} url={msg.sender.avatarUrl} size={28}/>}
                    </div>
                  )}
                  <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                    {showAvatar && !isMine && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, paddingLeft: 2 }}>
                        {msg.sender.fullName ?? "Người dùng"}
                      </div>
                    )}
                    <div style={{
                      padding: msg.type === "LOCATION" ? "8px 12px" : "8px 12px",
                      borderRadius: isMine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: isMine
                        ? "linear-gradient(135deg,var(--brand-primary),var(--brand-violet))"
                        : "var(--bg-elevated)",
                      color: isMine ? "#fff" : "var(--text-primary)",
                      fontSize: 13, lineHeight: 1.5,
                      boxShadow: isMine ? "0 2px 8px rgba(99,102,241,.3)" : "none",
                      wordBreak: "break-word",
                    }}>
                      {msg.type === "LOCATION"
                        ? <LocationBubble content={msg.content} metadata={msg.metadata}/>
                        : msg.content
                      }
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, paddingLeft: 2, paddingRight: 2 }}>
                      {formatTime(msg.createdAt)}
                      {isMine && <span style={{ marginLeft: 4 }}>✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 8,
        background: "var(--bg-surface)", flexShrink: 0,
      }}>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={sendLocation}
            disabled={locating}
            title="Gửi vị trí"
            style={{
              padding: "5px 10px", borderRadius: 8, fontSize: 13, cursor: "pointer",
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 5,
              opacity: locating ? .5 : 1,
            }}>
            📍 {locating ? "Đang lấy..." : "Vị trí"}
          </button>
          <button
            onClick={() => {
              const emojis = ["👍", "🙏", "😊", "❤️", "🔥", "✅", "👌", "😄"];
              setInput((prev) => prev + emojis[Math.floor(Math.random() * emojis.length)]);
              inputRef.current?.focus();
            }}
            title="Emoji"
            style={{
              padding: "5px 8px", borderRadius: 8, fontSize: 14, cursor: "pointer",
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}>
            😊
          </button>
        </div>

        {/* Text input */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Enter để gửi)"
            rows={1}
            style={{
              flex: 1, padding: "9px 12px",
              background: "var(--bg-overlay)", border: "1px solid var(--border-subtle)",
              borderRadius: 10, color: "var(--text-primary)", fontSize: 13, outline: "none",
              resize: "none", fontFamily: "inherit", lineHeight: 1.5,
              maxHeight: 80, overflowY: "auto",
            }}
            onFocus={(e) => e.target.style.borderColor = "var(--brand-primary)"}
            onBlur={(e)  => e.target.style.borderColor = "var(--border-subtle)"}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 80) + "px";
            }}
          />
          <button
            onClick={() => sendText(input)}
            disabled={!input.trim() || sending}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: input.trim() && !sending ? "var(--grad-primary)" : "var(--bg-overlay)",
              border: "none", cursor: input.trim() && !sending ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all .15s",
              boxShadow: input.trim() && !sending ? "0 2px 10px rgba(99,102,241,.4)" : "none",
            }}>
            {sending ? "⏳" : "▶"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          div[style*="position: fixed"][style*="bottom: 80px"] {
            bottom: 0 !important; right: 0 !important; left: 0 !important;
            width: auto !important; border-radius: 16px 16px 0 0 !important;
            height: 85vh !important;
          }
        }
      `}</style>
    </div>
  );
}
