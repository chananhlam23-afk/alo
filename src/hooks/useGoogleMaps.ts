"use client";
import { useEffect, useState } from "react";

type LoadState = "idle" | "loading" | "ready" | "error";

// ─── Singleton state (module-level, persists across renders/HMR) ──────────────
let gState: LoadState = "idle";
const subs = new Set<(s: LoadState) => void>();

function broadcast(s: LoadState) {
  if (gState === s) return; // no-op if state unchanged → prevents loops
  gState = s;
  subs.forEach((fn) => fn(s));
}

function isPlacesReady(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    return (
      typeof g?.maps?.places?.AutocompleteService === "function" &&
      typeof g?.maps?.places?.PlacesService === "function"
    );
  } catch {
    return false;
  }
}

// Called at most once per page load
let scriptAppended = false;

function appendScript(key: string) {
  if (scriptAppended) return;
  scriptAppended = true;
  broadcast("loading");

  const el = document.createElement("script");
  el.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=vi&region=VN`;
  el.async = true;

  el.addEventListener("load", () => {
    // Poll until places API is available (usually immediate, but can take 1-2 ticks)
    let ticks = 0;
    const check = () => {
      if (isPlacesReady()) {
        broadcast("ready");
      } else if (ticks++ < 30) {
        setTimeout(check, 100);
      } else {
        console.error("[Maps] google.maps.places not available after script load.");
        broadcast("error");
      }
    };
    check();
  });

  el.addEventListener("error", () => {
    console.error("[Maps] Script load failed. Check API key and CSP.");
    broadcast("error");
  });

  document.head.appendChild(el);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGoogleMaps() {
  const [state, setState] = useState<LoadState>(() => {
    // Initializer runs once — safe to check window here on client
    if (typeof window !== "undefined" && isPlacesReady()) return "ready";
    return gState;
  });

  // Subscribe to global state broadcasts (stable: no dependencies that change)
  useEffect(() => {
    subs.add(setState);
    return () => { subs.delete(setState); };
  }, []); // [] is correct here — we only want to subscribe once

  // Trigger load (runs once on mount, deps are stable)
  useEffect(() => {
    // Already loaded via SSR/HMR or previous component mount
    if (isPlacesReady()) {
      broadcast("ready");
      return;
    }
    // Already triggered by a previous component
    if (gState === "loading" || gState === "ready" || gState === "error") return;

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
    if (!key) {
      console.warn("[Maps] NEXT_PUBLIC_GOOGLE_MAPS_KEY is missing.");
      return;
    }

    appendScript(key);
  }, []); // [] intentional — must only run once per app lifetime

  return {
    ready: state === "ready",
    loading: state === "loading",
    error: state === "error",
  };
}
