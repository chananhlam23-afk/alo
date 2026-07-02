"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  lat: number;
  lng: number;
}

interface Props {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (result: PlaceResult) => void;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  autoFocus?: boolean;
}

interface PhotonProps {
  name?: string; housenumber?: string; street?: string; locality?: string;
  district?: string; city?: string; county?: string; state?: string;
  country?: string; countrycode?: string; postcode?: string;
}

// Photon (photon.komoot.io) — geocoder dựa trên OpenStreetMap, MIỄN PHÍ, không cần key,
// và được thiết kế cho autocomplete/gõ-tới-đâu-gợi-ý-tới-đó (Nominatim cấm kiểu dùng này).
async function searchPhoton(query: string): Promise<Suggestion[]> {
  if (!query.trim() || query.length < 2) return [];
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "7");
    // Ưu tiên kết quả quanh Việt Nam (Đà Nẵng làm tâm)
    url.searchParams.set("lat", "16.047");
    url.searchParams.set("lon", "108.206");

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data: { features?: Array<{ properties: PhotonProps; geometry: { coordinates: [number, number] } }> } =
      await res.json();

    return (data.features ?? [])
      // Ưu tiên địa chỉ ở Việt Nam
      .filter((f) => !f.properties.countrycode || f.properties.countrycode === "VN")
      .map((f, idx) => {
        const p = f.properties;
        const [lng, lat] = f.geometry.coordinates;

        const streetLine = [p.housenumber, p.street].filter(Boolean).join(" ");
        const mainText = p.name || streetLine || p.city || p.country || "Vị trí";

        const rest: string[] = [];
        if (streetLine && !mainText.includes(streetLine)) rest.push(streetLine);
        if (p.district && p.district !== mainText) rest.push(p.district);
        if (p.city && p.city !== mainText) rest.push(p.city);
        if (p.state && p.state !== p.city) rest.push(p.state);
        if (p.country) rest.push(p.country);
        const secondaryText = [...new Set(rest)].join(", ");

        return {
          id: `${idx}-${lat.toFixed(5)}-${lng.toFixed(5)}`,
          mainText,
          secondaryText,
          fullText: secondaryText ? `${mainText}, ${secondaryText}` : mainText,
          lat,
          lng,
        };
      });
  } catch { return []; }
}

export default function PlaceAutocomplete({
  placeholder, value, onChange, onSelect, icon, style, autoFocus,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open,        setOpen]        = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(-1);
  const [fetching,    setFetching]    = useState(false);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim() || input.length < 2) { setSuggestions([]); setOpen(false); return; }

    setFetching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchPhoton(input);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActiveIdx(-1);
      setFetching(false);
    }, 350);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    fetchSuggestions(e.target.value);
  };

  const selectSuggestion = (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    onChange(s.fullText);
    onSelect({ address: s.fullText, lat: s.lat, lng: s.lng });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      {/* Input */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <div style={{ position: "absolute", left: 14, zIndex: 1, pointerEvents: "none", display: "flex" }}>
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          style={{
            width: "100%",
            padding: icon ? "13px 40px 13px 42px" : "13px 40px 13px 14px",
            background: "var(--bg-overlay, #1e293b)",
            border: "1px solid var(--border-subtle, rgba(99,102,241,.2))",
            borderRadius: open && suggestions.length > 0 ? "10px 10px 0 0" : "10px",
            color: "var(--text-primary, #f1f5f9)",
            fontSize: 14, outline: "none",
            transition: "border-color .2s, box-shadow .2s",
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = "var(--brand-primary, #6366f1)";
            e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-subtle, rgba(99,102,241,.2))";
            e.target.style.boxShadow = "none";
          }}
        />
        {/* Loading spinner / clear */}
        <div style={{ position: "absolute", right: 12, display: "flex", alignItems: "center" }}>
          {fetching ? (
            <div style={{
              width: 14, height: 14,
              border: "2px solid rgba(99,102,241,.2)", borderTopColor: "var(--brand-primary)",
              borderRadius: "50%", animation: "spin .6s linear infinite",
            }} />
          ) : value ? (
            <button
              type="button"
              onClick={() => { onChange(""); setSuggestions([]); setOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted, #475569)", fontSize: 16, lineHeight: 1, padding: 2 }}
            >×</button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999,
          background: "var(--bg-surface, #0f172a)",
          border: "1px solid var(--border-medium, rgba(99,102,241,.3))",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          boxShadow: "0 8px 32px rgba(0,0,0,.5)",
          listStyle: "none", margin: 0, padding: "4px 0",
          maxHeight: 280, overflowY: "auto",
        }}>
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              onMouseDown={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                background: i === activeIdx ? "rgba(99,102,241,.12)" : "transparent",
                borderBottom: i < suggestions.length - 1 ? "1px solid rgba(99,102,241,.06)" : "none",
                transition: "background .1s",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>📍</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: "var(--text-primary, #f1f5f9)", fontSize: 13, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {highlightMatch(s.mainText, value)}
                  </div>
                  {s.secondaryText && (
                    <div style={{
                      color: "var(--text-muted, #64748b)", fontSize: 11, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {s.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
          <li style={{ padding: "6px 14px", borderTop: "1px solid rgba(99,102,241,.06)" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted, #475569)", textAlign: "right" }}>
              © OpenStreetMap contributors
            </div>
          </li>
        </ul>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Highlight matching text
function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "var(--brand-secondary)", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
