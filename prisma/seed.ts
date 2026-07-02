import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: "0900000001" },
    update: {},
    create: {
      phone: "0900000001",
      fullName: "Admin Thuận Chuyến",
      role: "ADMIN",
    },
  });
  console.log("Admin:", admin.phone);

  // ── Pricing config ──────────────────────────────────────────────────────────
  const existingPricing = await prisma.pricingConfig.findFirst({ where: { isActive: true } });
  if (!existingPricing) {
    await prisma.pricingConfig.create({
      data: {
        baseFare: 20000,
        commissionPct: 0.15,
        costShareCapPct: 0.5,
        holdDays: 3,
        cargoPricing: { pricePerKg: 500, minKg: 1 },
        surgeRules: { peak: 1.2, rain: 1.1 },
        perKmTiers: [
          { upToKm: 30, pricePerKm: 4000 },
          { upToKm: 100, pricePerKm: 3500 },
          { upToKm: 999, pricePerKm: 3000 },
        ],
        isActive: true,
        updatedBy: admin.id,
      },
    });
    console.log("Pricing config created");
  }

  // ── Cargo config ─────────────────────────────────────────────────────────────
  await prisma.cargoConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", enabled: true, maxWeightKg: 200, pricePerKg: 500 },
  });
  console.log("Cargo config seeded");

  // ── Sample area pricing ──────────────────────────────────────────────────────
  const areaPairs = [
    { originProvince: "Hà Nội", destProvince: "Thanh Hóa", pricePerSeat: 200000 },
    { originProvince: "Hà Nội", destProvince: "Nghệ An", pricePerSeat: 280000 },
    { originProvince: "TP.HCM", destProvince: "Đà Lạt", pricePerSeat: 180000 },
    { originProvince: "TP.HCM", destProvince: "Vũng Tàu", pricePerSeat: 120000 },
    { originProvince: "Đà Nẵng", destProvince: "Huế", pricePerSeat: 100000 },
  ];

  for (const pair of areaPairs) {
    await prisma.areaPricing.upsert({
      where: { originProvince_destProvince: { originProvince: pair.originProvince, destProvince: pair.destProvince } },
      update: {},
      create: { ...pair, active: true },
    });
  }
  console.log("Area pricing seeded");

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
