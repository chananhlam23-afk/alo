import type { Metadata } from "next";
import { Be_Vietnam_Pro, Sora } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Be Vietnam Pro — font Việt hoá đẹp, bo tròn hiện đại (body).
// Sora — font display kỹ thuật/neon cho tiêu đề & logo.
const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
const display = Sora({
  // Sora has no `vietnamese` subset (only latin/latin-ext) — it's a display font
  // for the logo/headings. Vietnamese body text uses Be Vietnam Pro above.
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thuận Chuyến – Ghép chuyến xe liên tỉnh",
  description: "Nền tảng ghép chuyến xe liên tỉnh — tiết kiệm, an toàn và minh bạch",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('td-theme');
                  document.documentElement.setAttribute('data-theme', saved || 'light');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="bg-grid" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
