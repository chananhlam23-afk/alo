-- CreateTable
CREATE TABLE "landing_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'main',
    "navBrand" TEXT NOT NULL DEFAULT 'Thuận Chuyến',
    "navItems" JSONB NOT NULL DEFAULT '[]',
    "heroBadge" TEXT NOT NULL DEFAULT 'Thuận đường · Thuận chuyến · Thuận người',
    "heroTitle" TEXT NOT NULL DEFAULT 'Mỗi cuốc xe —',
    "heroHighlight" TEXT NOT NULL DEFAULT 'một câu chuyện người',
    "heroSubtitle" TEXT NOT NULL DEFAULT 'Tài xế không còn trống xe về. Hành khách không còn trả giá cao.\nThuận Chuyến kết nối họ lại — bằng AI, bằng trái tim.',
    "heroFeatures" JSONB NOT NULL DEFAULT '[]',
    "socialVisible" BOOLEAN NOT NULL DEFAULT true,
    "socialTitle" TEXT NOT NULL DEFAULT 'Hàng ngàn tài xế & hành khách tin dùng',
    "socialSub" TEXT NOT NULL DEFAULT 'Tham gia cộng đồng Thuận Chuyến ngay hôm nay',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "footerGroups" JSONB NOT NULL DEFAULT '[]',
    "footerCopy" TEXT NOT NULL DEFAULT '© 2025 Thuận Chuyến. All rights reserved.',
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landing_configs_key_key" ON "landing_configs"("key");
