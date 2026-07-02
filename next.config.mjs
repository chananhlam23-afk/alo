/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // SAMEORIGIN (không DENY) để admin/landing tự nhúng /login vào iframe preview.
          // Vẫn chống clickjacking từ site khác.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Leaflet tiles (CartoDB) + Supabase + OSM/Nominatim icons + avatar/ảnh demo (pravatar, picsum, unsplash)
              "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://*.supabase.co https://nominatim.openstreetmap.org https://i.pravatar.cc https://picsum.photos https://fastly.picsum.photos https://images.unsplash.com https://*.googleusercontent.com https://*.gravatar.com",
              // API calls: Supabase, Goong, Nominatim (reverse-geocode), Photon (autocomplete)
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://rsapi.goong.io https://nominatim.openstreetmap.org https://photon.komoot.io",
              "worker-src 'self' blob:",
              // 'self' cho phép trang admin nhúng chính trang của mình (live preview)
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
