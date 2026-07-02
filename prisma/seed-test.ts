/**
 * Tạo tài khoản + dữ liệu TEST cho QA (admin / khách / tài xế).
 * Chạy: cd web && npx ts-node prisma/seed-test.ts
 * Mật khẩu tất cả: Test@12345
 */
import { readFileSync } from "fs";

// ts-node không tự nạp .env → nạp thủ công (DATABASE_URL nằm trong .env).
try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (k && !(k in process.env)) process.env[k] = v;
  }
} catch { /* ignore */ }

import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = hashSync("Test@12345", 10);

  // ── Admin ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin-test@thuanchuyen.local" },
    update: { role: "ADMIN", passwordHash: pw },
    create: { email: "admin-test@thuanchuyen.local", fullName: "Admin Test", role: "ADMIN", passwordHash: pw },
  });

  // ── Khách ──────────────────────────────────────────────────────────────────
  const customer = await prisma.user.upsert({
    where: { email: "customer-test@thuanchuyen.local" },
    update: { role: "CUSTOMER", passwordHash: pw },
    create: { email: "customer-test@thuanchuyen.local", fullName: "Khách Test", phone: "0911000001", role: "CUSTOMER", passwordHash: pw },
  });

  // ── Tài xế ĐÃ DUYỆT (để login + dashboard) ──────────────────────────────────
  const driver = await prisma.user.upsert({
    where: { email: "driver-test@thuanchuyen.local" },
    update: { role: "DRIVER", passwordHash: pw },
    create: { email: "driver-test@thuanchuyen.local", fullName: "Tài Xế Test", phone: "0922000001", role: "DRIVER", passwordHash: pw },
  });
  const dp = await prisma.driverProfile.upsert({
    where: { userId: driver.id },
    update: { verificationStatus: "APPROVED" },
    create: {
      userId: driver.id, vehicleType: "CAR", vehiclePlate: "51A-99999", seats: 4,
      cccdNumber: "012345678901", address: "TP. Hồ Chí Minh",
      verificationStatus: "APPROVED", isOnline: false, rating: 4.8, totalTrips: 12,
    },
  });
  await prisma.driverWallet.upsert({
    where: { driverProfileId: dp.id },
    update: { withdrawableBalance: 500000 },
    create: { driverProfileId: dp.id, withdrawableBalance: 500000, pendingBalance: 120000 },
  });
  await prisma.driverStreak.upsert({
    where: { driverProfileId: dp.id }, update: {}, create: { driverProfileId: dp.id, currentStreak: 3 },
  });

  // ── Tài xế CHỜ DUYỆT KYC (để test admin/drivers) ────────────────────────────
  const driver2 = await prisma.user.upsert({
    where: { email: "driver-pending@thuanchuyen.local" },
    update: { role: "DRIVER", passwordHash: pw },
    create: { email: "driver-pending@thuanchuyen.local", fullName: "Tài Xế Chờ Duyệt", phone: "0922000002", role: "DRIVER", passwordHash: pw },
  });
  await prisma.driverProfile.upsert({
    where: { userId: driver2.id },
    update: { verificationStatus: "PENDING" },
    create: {
      userId: driver2.id, vehicleType: "VAN", vehiclePlate: "51B-11111", seats: 7,
      cccdNumber: "098765432109", address: "Hà Nội",
      verificationStatus: "PENDING", isOnline: false,
    },
  });

  // ── 1 yêu cầu rút tiền PENDING (admin/withdrawals) ──────────────────────────
  const hasWd = await prisma.withdrawalRequest.findFirst({ where: { driverProfileId: dp.id, status: "PENDING" } });
  if (!hasWd) {
    await prisma.withdrawalRequest.create({
      data: { driverProfileId: dp.id, amount: 300000, bankName: "Vietcombank", bankAccountNo: "0123456789", bankAccountName: "TAI XE TEST", status: "PENDING" },
    });
  }

  // ── 1 báo cáo OPEN (admin/reports) ──────────────────────────────────────────
  const hasReport = await prisma.report.findFirst({ where: { reporterId: customer.id, reportedUserId: driver.id } });
  if (!hasReport) {
    await prisma.report.create({
      data: { reporterId: customer.id, reportedUserId: driver.id, reason: "Tài xế đến trễ", description: "Tài xế đến muộn 20 phút so với giờ hẹn.", evidenceUrls: [], status: "OPEN" },
    });
  }

  console.log("✅ Tạo tài khoản test xong (mật khẩu: Test@12345):");
  console.log("   ADMIN    :", admin.email);
  console.log("   KHÁCH    :", customer.email);
  console.log("   TÀI XẾ   :", driver.email, "(APPROVED)");
  console.log("   TÀI XẾ 2 :", driver2.email, "(PENDING KYC)");
}

main()
  .catch((e) => { console.error("❌", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
