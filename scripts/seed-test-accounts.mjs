// Tạo tài khoản test (admin/customer/driver) + dữ liệu mẫu để test UI/chức năng.
// Chạy: node scripts/seed-test-accounts.mjs
import env from "@next/env";
env.loadEnvConfig(process.cwd(), true);
const { PrismaClient } = await import("@prisma/client");
const bcrypt = (await import("bcryptjs")).default;

const prisma = new PrismaClient();
const hash = (p) => bcrypt.hash(p, 12);

async function main() {
  // ── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@thuanchuyen.test" },
    update: { passwordHash: await hash("Admin@123456"), role: "ADMIN", fullName: "Admin Test", isBlocked: false },
    create: { email: "admin@thuanchuyen.test", phone: "0900000010", passwordHash: await hash("Admin@123456"), role: "ADMIN", fullName: "Admin Test" },
  });

  // ── Customer ────────────────────────────────────────────────────────────────
  const customer = await prisma.user.upsert({
    where: { email: "customer@thuanchuyen.test" },
    update: { passwordHash: await hash("Khach@123456"), role: "CUSTOMER", fullName: "Khách Test", isBlocked: false },
    create: { email: "customer@thuanchuyen.test", phone: "0900000011", passwordHash: await hash("Khach@123456"), role: "CUSTOMER", fullName: "Khách Test" },
  });

  // ── Driver (+ profile APPROVED + wallet) ─────────────────────────────────────
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@thuanchuyen.test" },
    update: { passwordHash: await hash("Taixe@123456"), role: "DRIVER", fullName: "Tài Xế Test", isBlocked: false },
    create: { email: "driver@thuanchuyen.test", phone: "0900000012", passwordHash: await hash("Taixe@123456"), role: "DRIVER", fullName: "Tài Xế Test" },
  });
  const driver = await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: { verificationStatus: "APPROVED", isOnline: true },
    create: {
      userId: driverUser.id,
      vehicleType: "Sedan 4 chỗ",
      vehiclePlate: "30A-99999",
      seats: 4,
      cccdNumber: "012345678901",
      address: "Hà Nội",
      verificationStatus: "APPROVED",
      isOnline: true,
      rating: 4.8,
    },
  });
  await prisma.driverWallet.upsert({
    where: { driverProfileId: driver.id },
    update: {},
    create: { driverProfileId: driver.id, withdrawableBalance: 250000, pendingBalance: 80000 },
  });

  // ── Pricing config (cần cho tính giá) ────────────────────────────────────────
  const pricing = await prisma.pricingConfig.findFirst({ where: { isActive: true } });
  if (!pricing) {
    await prisma.pricingConfig.create({
      data: {
        baseFare: 20000, commissionPct: 0.15, costShareCapPct: 0.5, holdDays: 3,
        cargoPricing: { pricePerKg: 500 }, surgeRules: {},
        perKmTiers: [{ upToKm: 30, pricePerKm: 4000 }, { upToKm: 100, pricePerKm: 3500 }, { upToKm: 999, pricePerKm: 3000 }],
        isActive: true, updatedBy: admin.id,
      },
    });
  }

  // ── Dữ liệu mẫu: đơn hàng trải 14 ngày (cho biểu đồ + trang Đơn hàng) ─────────
  await prisma.tripRequest.deleteMany({ where: { customerId: customer.id, passengerName: { startsWith: "SEED-" } } });
  const now = Date.now();
  const DAY = 86_400_000;
  const routes = [
    { p: "Hà Nội",  d: "Thanh Hóa", plat: 21.03, plng: 105.85, dlat: 19.81, dlng: 105.78, price: 250000, km: 150, min: 180 },
    { p: "Hà Nội",  d: "Nghệ An",   plat: 21.03, plng: 105.85, dlat: 18.67, dlng: 105.69, price: 350000, km: 290, min: 330 },
    { p: "TP.HCM",  d: "Vũng Tàu",  plat: 10.78, plng: 106.70, dlat: 10.35, dlng: 107.08, price: 180000, km: 95,  min: 120 },
  ];
  let pendingCount = 0, matchedCount = 0;
  for (let i = 0; i < 12; i++) {
    const r = routes[i % routes.length];
    const dayAgo = i % 14;
    const matched = i % 3 === 0;
    await prisma.tripRequest.create({
      data: {
        customerId: customer.id,
        passengerName: `SEED-Khách ${i + 1}`,
        passengerPhone: "0900000011",
        pickupLat: r.plat, pickupLng: r.plng, pickupAddress: `${r.p} — điểm đón ${i + 1}`,
        dropoffLat: r.dlat, dropoffLng: r.dlng, dropoffAddress: `${r.d} — điểm trả ${i + 1}`,
        departureTime: new Date(now + DAY),
        seats: (i % 3) + 1,
        bookingMode: "OPEN_WAIT",
        quotedPrice: r.price,
        distanceKm: r.km,
        durationMin: r.min,
        status: matched ? "MATCHED" : "PENDING",
        createdAt: new Date(now - dayAgo * DAY - i * 3_600_000),
        expiresAt: new Date(now + 2 * DAY),
      },
    });
    matched ? matchedCount++ : pendingCount++;
  }

  console.log("✓ Tài khoản test sẵn sàng:");
  console.log("  ADMIN    admin@thuanchuyen.test    / Admin@123456");
  console.log("  CUSTOMER customer@thuanchuyen.test / Khach@123456");
  console.log("  DRIVER   driver@thuanchuyen.test   / Taixe@123456  (KYC APPROVED)");
  console.log(`✓ Đơn mẫu: ${pendingCount} PENDING + ${matchedCount} MATCHED (trải 14 ngày)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
