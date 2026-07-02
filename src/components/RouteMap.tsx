"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";

interface LatLng { lat: number; lng: number }
interface Props {
  pickup?: LatLng | null;
  dropoff?: LatLng | null;
  style?: React.CSSProperties;
}

// Decode Google/Goong encoded polyline
function decodePolyline(encoded: string): [number, number][] {
  const out: [number, number][] = [];
  let idx = 0, lat = 0, lng = 0;
  while (idx < encoded.length) {
    let b: number, shift = 0, val = 0;
    do { b = encoded.charCodeAt(idx++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += val & 1 ? ~(val >> 1) : val >> 1;
    shift = 0; val = 0;
    do { b = encoded.charCodeAt(idx++) - 63; val |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += val & 1 ? ~(val >> 1) : val >> 1;
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

export default function RouteMap({ pickup, dropoff, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const pickupRef    = useRef<L.CircleMarker | null>(null);
  const dropoffRef   = useRef<L.CircleMarker | null>(null);
  const polyRef      = useRef<L.Polyline | null>(null);
  const [routeErr, setRouteErr] = useState<string | null>(null);

  /* ── Init Leaflet map ──────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    import("leaflet").then((L) => {
      // Guard against StrictMode double-invoke: if cleanup already ran, bail out
      if (cancelled || !containerRef.current) return;
      // Guard against container already having a map (HMR / double mount)
      const el = containerRef.current as HTMLElement & { _leaflet_id?: number };
      if (el._leaflet_id) return;
      if (mapRef.current) return;

      // @ts-expect-error - webpack leaflet icon fix
      delete L.Icon.Default.prototype._getIconUrl;

      const map = L.map(containerRef.current, {
        center: [16.047, 108.206],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter — free, no API key, dark theme ✓
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      cancelled = true;        // prevent async callback from running after unmount
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── Update markers & route ────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("leaflet").then((L) => {
      // Remove old layers
      pickupRef.current?.remove();
      dropoffRef.current?.remove();
      polyRef.current?.remove();
      pickupRef.current = dropoffRef.current = polyRef.current = null;
      setRouteErr(null);

      // Pickup marker — cyan circle
      if (pickup) {
        pickupRef.current = L.circleMarker([pickup.lat, pickup.lng], {
          radius: 10, color: "#fff", weight: 2.5,
          fillColor: "var(--brand-secondary)", fillOpacity: 1,
        })
          .bindTooltip("📍 Điểm đón", { permanent: false, direction: "top" })
          .addTo(map);
      }

      // Dropoff marker — pink circle
      if (dropoff) {
        dropoffRef.current = L.circleMarker([dropoff.lat, dropoff.lng], {
          radius: 10, color: "#fff", weight: 2.5,
          fillColor: "var(--brand-pink)", fillOpacity: 1,
        })
          .bindTooltip("🏁 Điểm trả", { permanent: false, direction: "top" })
          .addTo(map);
      }

      if (pickup && dropoff) {
        const p = pickup, d = dropoff;
        const origin = `${p.lat},${p.lng}`;
        const dest   = `${d.lat},${d.lng}`;

        // Fallback: đường thẳng nét đứt (khi không có tuyến đường thật)
        const drawStraight = () => {
          polyRef.current = L.polyline(
            [[p.lat, p.lng], [d.lat, d.lng]],
            { color: "var(--brand-primary)", weight: 3, opacity: .6, dashArray: "8 6" }
          ).addTo(map);
          map.fitBounds([[p.lat, p.lng], [d.lat, d.lng]], { padding: [40, 40] });
        };

        // Lấy tuyến đường thật qua proxy /api/maps/directions (Goong → OSRM keyless)
        fetch(`/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.error || !data.polyline) {
              drawStraight();
              return;
            }
            const path = decodePolyline(data.polyline);
            polyRef.current = L.polyline(path, {
              color: "var(--brand-primary)", weight: 5, opacity: .9,
            }).addTo(map);
            map.fitBounds(polyRef.current.getBounds(), { padding: [50, 50] });
          })
          .catch(() => drawStraight());
      } else if (pickup) {
        map.setView([pickup.lat, pickup.lng], 13);
      } else {
        map.setView([16.047, 108.206], 6);
      }
    });
  }, [pickup, dropoff]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", ...style }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {routeErr && (
        <div style={{
          position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
          background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 8, padding: "8px 14px", color: "#fca5a5", fontSize: 12, zIndex: 999,
          whiteSpace: "nowrap",
        }}>
          ⚠️ {routeErr}
        </div>
      )}

      {/* Leaflet CSS */}
      <style>{`
        .leaflet-container { background: #0f172a; font-family: inherit; }
        .leaflet-tile { filter: brightness(.85) contrast(1.1); }
        .leaflet-control-zoom a {
          background: rgba(15,23,42,.9) !important;
          border-color: rgba(99,102,241,.3) !important;
          color: #94a3b8 !important;
        }
        .leaflet-control-zoom a:hover { background: rgba(99,102,241,.2) !important; color:#fff!important; }
        .leaflet-tooltip {
          background: rgba(15,23,42,.9);
          border: 1px solid rgba(99,102,241,.3);
          color: #f1f5f9; font-size: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,.4);
          border-radius: 6px;
        }
        .leaflet-tooltip::before { border-top-color: rgba(99,102,241,.3) !important; }
      `}</style>
    </div>
  );
}
