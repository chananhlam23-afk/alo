import type { LandingConfigData, ThemeConfig } from "@/types/landing";

const uid = () => Math.random().toString(36).slice(2, 10);

/* Default theme — bảng màu Xanh SM: nền sáng, xanh cyan-green tươi, phẳng,
 * thân thiện (bỏ tông tím/indigo + neon để giảm cảm giác "AI"). */
export const DEFAULT_THEME: ThemeConfig = {
  brandPrimary:     "#00C2A8",  // Xanh cyan-green đặc trưng — nút/điểm nhấn (chữ tối trên nền này)
  brandPrimaryDark: "#00806E",  // Teal đậm — chữ/link trên nền trắng (đạt AA), cuối gradient
  brandLight:       "#33D1BC",  // Cyan nhạt — icon/nền nhạt
  brandSecondary:   "#0BA5C7",  // Cyan-xanh dương phụ
  brandViolet:      "#00806E",  // (thay tím) teal đậm
  brandPink:        "#F2994A",  // (thay hồng) cam ấm — thân thiện hơn
  brandEmerald:     "#12B886",  // Xanh lá
  brandAmber:       "#F2A93B",
  bgBase:     "#F4F7F6",  // Nền trang — trắng ngả mint rất nhạt
  bgDeep:     "#EAF1EF",  // Nền phần dưới hero
  bgSurface:  "#FFFFFF",  // Thẻ/card
  bgOverlay:  "#F1F5F4",  // Ô nhập / chip
  bgElevated: "#E7EEEC",  // Bề mặt khi hover
  textPrimary:   "#0E1B18",  // Gần đen (hơi ngả xanh)
  textSecondary: "#4A5A55",  // Chữ phụ
  textMuted:     "#6B7B76",   // Chữ mờ
  borderColor:   "#E2E8E6",   // Viền mảnh
  success: "#12B886",
  danger:  "#E03E3E",
  warning: "#F2A93B",
  info:    "#0BA5C7",
  gradFrom:  "#00C2A8",
  gradTo:    "#00A18B",  // Gradient cùng tông cyan-green (không cầu vồng)
  gradAngle: 135,
  radius:    14,
};

/* Called once on first DB access to seed the singleton row */
export const DEFAULT_LANDING_CONFIG: LandingConfigData = {
  theme: DEFAULT_THEME,
  navBrand: "Thuận Chuyến",
  navItems: [
    { id: uid(), label: "Giới thiệu", href: "#about",    external: false, visible: true,  order: 1 },
    { id: uid(), label: "Tính năng",  href: "#features", external: false, visible: true,  order: 2 },
    { id: uid(), label: "Ưu đãi",     href: "#events",   external: false, visible: true,  order: 3 },
    { id: uid(), label: "Blog",        href: "#posts",    external: false, visible: true,  order: 4 },
    { id: uid(), label: "Hướng dẫn",  href: "/guide",    external: false, visible: true,  order: 5 },
  ],
  heroBadge: "Thuận đường · Thuận chuyến · Thuận người",
  heroTitle: "Mỗi cuốc xe —",
  heroHighlight: "một câu chuyện người",
  heroSubtitle:
    "Tài xế không còn trống xe về. Hành khách không còn trả giá cao.\nThuận Chuyến kết nối họ lại — bằng AI, bằng trái tim.",
  heroFeatures: [
    {
      id: uid(),
      geoType: "ai",
      title: "Không chạy xe trống về",
      desc: "AI ghép khách cùng hướng — tài xế tăng thu nhập, giảm nhiên liệu mỗi ca",
      visible: true,
      order: 1,
    },
    {
      id: uid(),
      geoType: "payment",
      title: "Giá thật, không phụ thu",
      desc: "Chi phí minh bạch, chia đều hành khách — yên tâm đặt chuyến mỗi ngày",
      visible: true,
      order: 2,
    },
    {
      id: uid(),
      geoType: "realtime",
      title: "Người thân biết bạn ở đâu",
      desc: "Theo dõi hành trình trực tiếp — bình an suốt từng km đường",
      visible: true,
      order: 3,
    },
    {
      id: uid(),
      geoType: "notification",
      title: "Chuyến mới, thông báo ngay",
      desc: "Zalo & Email tức thì — không bỏ lỡ một cơ hội kiếm thêm nào",
      visible: true,
      order: 4,
    },
  ],
  socialVisible: true,
  socialTitle: "Hàng ngàn tài xế & hành khách tin dùng",
  socialSub: "Tham gia cộng đồng Thuận Chuyến ngay hôm nay",
  sections: [
    {
      id: uid(),
      type: "events",
      visible: true,
      order: 1,
      title: "Chương trình khuyến mãi",
      subtitle: "Không bỏ lỡ những ưu đãi độc quyền dành riêng cho bạn",
      limit: 4,
      ctaLabel: "Xem tất cả ưu đãi",
      ctaHref: "/login",
    },
    {
      id: uid(),
      type: "posts",
      visible: true,
      order: 2,
      title: "Bài viết mới nhất",
      subtitle: "Hướng dẫn sử dụng, mẹo di chuyển, và câu chuyện từ cộng đồng Thuận Chuyến",
      limit: 6,
      ctaLabel: "Đọc thêm",
      ctaHref: "/blog",
    },
    {
      id: uid(),
      type: "how_it_works",
      visible: true,
      order: 3,
      title: "Cách hoạt động",
      subtitle: "Đơn giản, nhanh chóng, minh bạch — chỉ 3 bước là xong",
      limit: 3,
    },
  ],
  footerGroups: [
    {
      id: uid(),
      label: "Dịch vụ",
      links: [
        { id: uid(), label: "Đặt xe",    href: "/login", external: false },
        { id: uid(), label: "Chạy xe",   href: "/login", external: false },
        { id: uid(), label: "Gửi hàng",  href: "/login", external: false },
      ],
    },
    {
      id: uid(),
      label: "Hỗ trợ",
      links: [
        { id: uid(), label: "Hướng dẫn",  href: "/guide",   external: false },
        { id: uid(), label: "Blog",       href: "/blog",    external: false },
        { id: uid(), label: "Điều khoản", href: "#",        external: false },
      ],
    },
    {
      id: uid(),
      label: "Công ty",
      links: [
        { id: uid(), label: "Giới thiệu", href: "#about",   external: false },
        { id: uid(), label: "Liên hệ",    href: "#contact", external: false },
      ],
    },
  ],
  footerCopy: "© 2025 Thuận Chuyến. All rights reserved.",
};
