"use client";

import { useEffect, useState } from "react";
import type { ThemeConfig } from "@/types/landing";
import { themeToCssText } from "@/lib/landing/theme";

/**
 * Injects the landing theme as `:root` CSS-variable overrides. The landing
 * components read these variables, so changing a token re-skins the page.
 *
 * In `preview` mode (the admin's live-preview iframe) it also listens for
 * `{ type: "tc-theme", css }` postMessages and swaps the variables instantly —
 * no reload — giving a real-time "drag a colour, watch it change" editor.
 */
export default function ThemeStyle({
  theme,
  preview = false,
}: {
  theme: ThemeConfig;
  preview?: boolean;
}) {
  const [css, setCss] = useState(() => themeToCssText(theme));

  // Keep in sync if the server-provided theme changes (navigation / revalidate)
  useEffect(() => {
    setCss(themeToCssText(theme));
  }, [theme]);

  // Live preview channel
  useEffect(() => {
    if (!preview) return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (d && d.type === "tc-theme" && typeof d.css === "string") setCss(d.css);
    };
    window.addEventListener("message", onMsg);
    // Announce readiness so the editor can push the current draft immediately
    try {
      window.parent?.postMessage({ type: "tc-preview-ready" }, "*");
    } catch {
      /* cross-origin parent — ignore */
    }
    return () => window.removeEventListener("message", onMsg);
  }, [preview]);

  return <style id="tc-theme" dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}
