"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";

interface Stop { id: string; type: string; address: string; order: number; status: string; lat: number; lng: number }
interface Props {
  stops: Stop[];
  currentStopIndex: number;
  driverPos?: { lat: number; lng: number } | null;
  style?: React.CSSProperties;
}

export default function TripTrackingMap({ stops, currentStopIndex, driverPos, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<L.Layer[]>([]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;
      const el = containerRef.current as HTMLElement & { _leaflet_id?: number };
      if (el._leaflet_id || mapRef.current) return;

      // @ts-expect-error - webpack fix
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(containerRef.current, {
        zoom: 12, zoomControl: true, attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
      }).addTo(map);
      mapRef.current = map;

      renderMarkers(L, map);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => renderMarkers(L, mapRef.current!));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, currentStopIndex, driverPos]);

  function renderMarkers(L: typeof import("leaflet"), map: L.Map) {
    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const validStops = stops.filter((s) => s.lat && s.lng);
    if (!validStops.length) return;

    const bounds: [number, number][] = [];

    validStops.forEach((s) => {
      const isCurrent = s.order === currentStopIndex + 1;
      const isDone    = s.status === "DONE";
      const isSkipped = s.status === "SKIPPED";

      const color = isDone ? "#34d399"
        : isSkipped ? "#475569"
        : isCurrent ? "#6366f1"
        : s.type === "PICKUP" ? "#22d3ee" : "#f472b6";

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:${isCurrent ? 36 : 28}px;height:${isCurrent ? 36 : 28}px;
          border-radius:50%;background:${color};
          border:3px solid #fff;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:${isCurrent ? 14 : 11}px;
          box-shadow:0 0 ${isCurrent ? 16 : 6}px ${color}88;
          ${isCurrent ? "animation:pulse3 1.5s infinite;" : ""}
        ">${isDone ? "✓" : isSkipped ? "×" : s.order}</div>`,
        iconSize: [isCurrent ? 36 : 28, isCurrent ? 36 : 28],
        iconAnchor: [isCurrent ? 18 : 14, isCurrent ? 18 : 14],
      });

      const marker = L.marker([s.lat, s.lng], { icon })
        .bindTooltip(`<b>${s.type === "PICKUP" ? "Đón" : "Trả"} #${s.order}</b><br>${s.address}`, { direction: "top" })
        .addTo(map);

      markersRef.current.push(marker);
      bounds.push([s.lat, s.lng]);
    });

    // Draw route line through stops
    if (validStops.length > 1) {
      const line = L.polyline(
        validStops.map((s) => [s.lat, s.lng]),
        { color: "var(--brand-primary)", weight: 3, opacity: .6, dashArray: "6 4" }
      ).addTo(map);
      markersRef.current.push(line);
    }

    // Driver position
    if (driverPos) {
      const driverIcon = L.divIcon({
        className: "",
        html: `<div style="font-size:28px;filter:drop-shadow(0 0 8px var(--brand-primary));animation:pulse3 1s infinite;">🚗</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      const dm = L.marker([driverPos.lat, driverPos.lng], { icon: driverIcon })
        .bindTooltip("Tài xế", { permanent: true, direction: "top" })
        .addTo(map);
      markersRef.current.push(dm);
      bounds.push([driverPos.lat, driverPos.lng]);
    }

    if (bounds.length) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 });
  }

  return (
    <div style={{ position: "relative", ...style }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 300 }} />
      <style>{`
        @keyframes pulse3{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}
        .leaflet-container{background:#0f172a}
        .leaflet-tooltip{background:rgba(15,23,42,.9);border:1px solid rgba(99,102,241,.3);color:#f1f5f9;font-size:12px;border-radius:6px}
        .leaflet-tooltip::before{border-top-color:rgba(99,102,241,.3)!important}
        .leaflet-control-zoom a{background:rgba(15,23,42,.9)!important;border-color:rgba(99,102,241,.3)!important;color:#94a3b8!important}
      `}</style>
    </div>
  );
}
