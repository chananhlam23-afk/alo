/**
 * MOCK DATA "thật" cho demo/QA — người dùng, tài xế, đặt chuyến, đặt hàng,
 * KYC, đánh giá, báo cáo, rút tiền, ví, thông báo.
 *
 * Chạy:  cd web && npx ts-node --transpile-only prisma/seed-mock.ts
 *
 * - Tất cả tài khoản mock dùng email kết thúc @tc-mock.vn, mật khẩu: Mock@12345
 * - Idempotent: mỗi lần chạy sẽ XÓA sạch dữ liệu mock cũ rồi tạo lại.
 * - KHÔNG đụng tới tài khoản test (@thuanchuyen.local) hay seed gốc.
 */
import { readFileSync } from "fs";

// ts-node không tự nạp .env → nạp thủ công.
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
const PW = hashSync("Mock@12345", 10);

// ── Helpers thời gian ─────────────────────────────────────────────────────────
const NOW = new Date();
const hAgo  = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const hNext = (h: number) => new Date(NOW.getTime() + h * 3600_000);
const dAgo  = (d: number) => new Date(NOW.getTime() - d * 86400_000);
const avatar = (n: number) => `https://i.pravatar.cc/240?img=${((n * 7) % 70) + 1}`;
const doc    = (s: string) => `https://picsum.photos/seed/${s}/720/460`;
const net    = (fare: number) => Math.round(fare * 0.85); // tài xế nhận 85% (hoa hồng 15%)

// ── Địa điểm thật (toạ độ thực tế) ────────────────────────────────────────────
const PL: Record<string, { addr: string; lat: number; lng: number }> = {
  tsn:    { addr: "Sân bay Tân Sơn Nhất, Q. Tân Bình, TP.HCM", lat: 10.8188, lng: 106.6520 },
  bmd:    { addr: "Bến xe Miền Đông Mới, TP. Thủ Đức, TP.HCM", lat: 10.8830, lng: 106.8210 },
  benthanh:{ addr: "Chợ Bến Thành, Q.1, TP.HCM",               lat: 10.7720, lng: 106.6980 },
  q7:     { addr: "Phú Mỹ Hưng, Q.7, TP.HCM",                  lat: 10.7290, lng: 106.7210 },
  noibai: { addr: "Sân bay Nội Bài, Sóc Sơn, Hà Nội",          lat: 21.2210, lng: 105.8070 },
  hoankiem:{ addr: "Hồ Hoàn Kiếm, Q. Hoàn Kiếm, Hà Nội",       lat: 21.0287, lng: 105.8524 },
  mydinh: { addr: "Bến xe Mỹ Đình, Q. Nam Từ Liêm, Hà Nội",    lat: 21.0285, lng: 105.7780 },
  dnair:  { addr: "Sân bay Đà Nẵng, Q. Hải Châu, Đà Nẵng",     lat: 16.0439, lng: 108.1994 },
  mykhe:  { addr: "Bãi biển Mỹ Khê, Q. Sơn Trà, Đà Nẵng",      lat: 16.0593, lng: 108.2470 },
  ninhkieu:{ addr: "Bến Ninh Kiều, Q. Ninh Kiều, Cần Thơ",     lat: 10.0340, lng: 105.7880 },
  vungtau:{ addr: "Bãi Sau, TP. Vũng Tàu, Bà Rịa - Vũng Tàu",  lat: 10.3460, lng: 107.0840 },
  dalat:  { addr: "Chợ Đà Lạt, P.1, TP. Đà Lạt, Lâm Đồng",     lat: 11.9420, lng: 108.4380 },
  nhatrang:{ addr: "Tháp Bà Ponagar, TP. Nha Trang, Khánh Hòa",lat: 12.2655, lng: 109.1955 },
  bienhoa:{ addr: "Ngã tư Vũng Tàu, TP. Biên Hòa, Đồng Nai",   lat: 10.9000, lng: 106.8800 },
  binhduong:{addr: "TP. Mới Bình Dương, Bình Dương",           lat: 11.0560, lng: 106.6660 },
  phanthiet:{ addr: "Đồi cát bay Mũi Né, TP. Phan Thiết, Bình Thuận", lat: 10.9430, lng: 108.2880 },
  hue:    { addr: "Kinh thành Huế, TP. Huế, Thừa Thiên Huế",   lat: 16.4690, lng: 107.5790 },
};

// ── Người dùng thật (khách) ───────────────────────────────────────────────────
const CUSTOMERS = [
  { fullName: "Nguyễn Văn An",        phone: "0901100001", slug: "an.nguyen" },
  { fullName: "Trần Thị Bích Ngọc",   phone: "0901100002", slug: "ngoc.tran" },
  { fullName: "Lê Hoàng Phúc",        phone: "0901100003", slug: "phuc.le" },
  { fullName: "Phạm Thị Mai",         phone: "0901100004", slug: "mai.pham" },
  { fullName: "Hoàng Minh Tuấn",      phone: "0901100005", slug: "tuan.hoang" },
  { fullName: "Vũ Thị Lan Anh",       phone: "0901100006", slug: "lananh.vu" },
  { fullName: "Đặng Quốc Bảo",        phone: "0901100007", slug: "bao.dang" },
  { fullName: "Bùi Thị Hồng Nhung",   phone: "0901100008", slug: "nhung.bui" },
  { fullName: "Ngô Văn Đức",          phone: "0901100009", slug: "duc.ngo" },
  { fullName: "Dương Thị Thu Hà",     phone: "0901100010", slug: "ha.duong" },
  { fullName: "Đỗ Minh Khôi",         phone: "0901100011", slug: "khoi.do" },
  { fullName: "Lý Thị Kim Oanh",      phone: "0901100012", slug: "oanh.ly" },
];

// ── Tài xế thật ───────────────────────────────────────────────────────────────
const DRIVERS = [
  { fullName: "Trần Văn Hùng",   phone: "0931200001", slug: "hung.tran",   vehicleType: "CAR",   plate: "51F-238.45", seats: 4, cccd: "079085001234", address: "Q. Bình Thạnh, TP.HCM",   city: "tsn",      allowCargo: true,  cargoKg: 60,   status: "APPROVED", online: true,  rating: 4.9, trips: 87 },
  { fullName: "Nguyễn Đình Long",phone: "0931200002", slug: "long.nguyen", vehicleType: "VAN",   plate: "51H-512.09", seats: 9, cccd: "079088005678", address: "TP. Thủ Đức, TP.HCM",     city: "bmd",      allowCargo: true,  cargoKg: 200,  status: "APPROVED", online: true,  rating: 4.7, trips: 64 },
  { fullName: "Phạm Thanh Sơn",  phone: "0931200003", slug: "son.pham",    vehicleType: "CAR",   plate: "30G-145.78", seats: 4, cccd: "001086009012", address: "Q. Cầu Giấy, Hà Nội",     city: "hoankiem", allowCargo: false, cargoKg: null, status: "APPROVED", online: true,  rating: 4.8, trips: 120 },
  { fullName: "Lê Văn Thành",    phone: "0931200004", slug: "thanh.le",    vehicleType: "TRUCK", plate: "43C-678.90", seats: 2, cccd: "048090003456", address: "Q. Liên Chiểu, Đà Nẵng",  city: "dnair",    allowCargo: true,  cargoKg: 1000, status: "APPROVED", online: false, rating: 4.6, trips: 45 },
  { fullName: "Võ Hoàng Nam",    phone: "0931200005", slug: "nam.vo",      vehicleType: "CAR",   plate: "65A-334.12", seats: 4, cccd: "092091007890", address: "Q. Ninh Kiều, Cần Thơ",   city: "ninhkieu", allowCargo: true,  cargoKg: 50,   status: "APPROVED", online: false, rating: 5.0, trips: 33 },
  { fullName: "Hồ Văn Tài",      phone: "0931200006", slug: "tai.ho",      vehicleType: "VAN",   plate: "79B-220.55", seats: 7, cccd: "056092001122", address: "TP. Nha Trang, Khánh Hòa",city: "nhatrang", allowCargo: true,  cargoKg: 150,  status: "PENDING",  online: false, rating: 5.0, trips: 0 },
  { fullName: "Đinh Công Phú",   phone: "0931200007", slug: "phu.dinh",    vehicleType: "CAR",   plate: "60A-781.23", seats: 4, cccd: "075093003344", address: "TP. Biên Hòa, Đồng Nai",  city: "bienhoa",  allowCargo: false, cargoKg: null, status: "PENDING",  online: false, rating: 5.0, trips: 0 },
  { fullName: "Cao Văn Lực",     phone: "0931200008", slug: "luc.cao",     vehicleType: "CAR",   plate: "49A-099.88", seats: 4, cccd: "068094005566", address: "TP. Đà Lạt, Lâm Đồng",    city: "dalat",    allowCargo: false, cargoKg: null, status: "REJECTED", online: false, rating: 5.0, trips: 0, reject: "Ảnh CCCD mặt sau bị mờ, không đọc được số. Vui lòng chụp lại rõ nét và nộp lại hồ sơ." },
];

const BANKS = ["Vietcombank", "Techcombank", "BIDV", "VietinBank", "ACB", "MB Bank", "Sacombank", "VPBank", "Agribank", "TPBank"];
const DOC_TYPES: Array<{ t: string; tag: string }> = [
  { t: "CCCD_FRONT", tag: "cccd-front" },
  { t: "CCCD_BACK", tag: "cccd-back" },
  { t: "DRIVER_LICENSE", tag: "gplx" },
  { t: "VEHICLE_REGISTRATION", tag: "cavet" },
  { t: "SELFIE", tag: "selfie" },
];

async function cleanup() {
  const mock = await prisma.user.findMany({
    where: { email: { endsWith: "@tc-mock.vn" } },
    select: { id: true, driverProfile: { select: { id: true, wallet: { select: { id: true } } } } },
  });
  if (!mock.length) return;
  const userIds = mock.map((u) => u.id);
  const dpIds = mock.map((u) => u.driverProfile?.id).filter(Boolean) as string[];
  const walletIds = mock.map((u) => u.driverProfile?.wallet?.id).filter(Boolean) as string[];

  const trips = await prisma.trip.findMany({ where: { driverProfileId: { in: dpIds } }, select: { id: true } });
  const tripIds = trips.map((t) => t.id);
  const reqs = await prisma.tripRequest.findMany({ where: { customerId: { in: userIds } }, select: { id: true } });
  const reqIds = reqs.map((r) => r.id);

  const inU = { in: userIds };
  const inDp = { in: dpIds };
  const inTrip = { in: tripIds };

  await prisma.rating.deleteMany({ where: { OR: [{ giverId: inU }, { receiverId: inU }] } });
  await prisma.message.deleteMany({ where: { tripId: inTrip } });
  await prisma.payment.deleteMany({ where: { tripId: inTrip } });
  await prisma.tripStop.deleteMany({ where: { tripId: inTrip } });
  await prisma.tripPassenger.deleteMany({ where: { tripId: inTrip } });
  await prisma.cargoRequest.deleteMany({ where: { senderId: inU } });
  await prisma.tripMatch.deleteMany({ where: { OR: [{ requestId: { in: reqIds } }, { driverProfileId: inDp }] } });
  await prisma.trip.deleteMany({ where: { id: inTrip } });
  await prisma.tripRequest.deleteMany({ where: { id: { in: reqIds } } });
  await prisma.walletTransaction.deleteMany({ where: { walletId: { in: walletIds } } });
  await prisma.withdrawalRequest.deleteMany({ where: { driverProfileId: inDp } });
  await prisma.driverWallet.deleteMany({ where: { driverProfileId: inDp } });
  await prisma.driverStreak.deleteMany({ where: { driverProfileId: inDp } });
  await prisma.driverRoute.deleteMany({ where: { driverProfileId: inDp } });
  await prisma.kycDocument.deleteMany({ where: { driverProfileId: inDp } });
  await prisma.report.deleteMany({ where: { OR: [{ reporterId: inU }, { reportedUserId: inU }] } });
  await prisma.notificationLog.deleteMany({ where: { userId: inU } });
  await prisma.device.deleteMany({ where: { userId: inU } });
  await prisma.driverProfile.deleteMany({ where: { id: inDp } });
  await prisma.account.deleteMany({ where: { userId: inU } });
  await prisma.session.deleteMany({ where: { userId: inU } });
  await prisma.user.deleteMany({ where: { id: inU } });
  console.log(`🧹 Đã xoá ${userIds.length} tài khoản mock cũ + dữ liệu liên quan.`);
}

async function main() {
  await cleanup();

  // ── Khách ──────────────────────────────────────────────────────────────────
  const customers: any[] = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    customers.push(
      await prisma.user.create({
        data: {
          email: `${c.slug}@tc-mock.vn`, phone: c.phone, fullName: c.fullName,
          role: "CUSTOMER", passwordHash: PW, avatarUrl: avatar(i + 1),
          emailVerified: dAgo(30 - i),
        },
      })
    );
  }
  console.log(`👤 ${customers.length} khách.`);

  // ── Tài xế (+ profile, KYC, ví, streak, tuyến) ──────────────────────────────
  const drivers: any[] = [];
  for (let i = 0; i < DRIVERS.length; i++) {
    const d = DRIVERS[i];
    const city = PL[d.city];
    const isApproved = d.status === "APPROVED";
    const user = await prisma.user.create({
      data: {
        email: `${d.slug}@tc-mock.vn`, phone: d.phone, fullName: d.fullName,
        role: "DRIVER", passwordHash: PW, avatarUrl: avatar(40 + i), emailVerified: dAgo(60 - i),
      },
    });
    const dp = await prisma.driverProfile.create({
      data: {
        userId: user.id, vehicleType: d.vehicleType, vehiclePlate: d.plate, seats: d.seats,
        cccdNumber: d.cccd, address: d.address, allowCargo: d.allowCargo, cargoCapacityKg: d.cargoKg,
        verificationStatus: d.status as any, rejectReason: (d as any).reject ?? null,
        isOnline: d.online, currentLat: d.online ? city.lat : null, currentLng: d.online ? city.lng : null,
        locationUpdatedAt: d.online ? hAgo(0.2) : null, rating: d.rating, totalTrips: d.trips,
      },
    });
    // KYC docs (mọi tài xế đều nộp đủ 5 giấy tờ)
    await prisma.kycDocument.createMany({
      data: DOC_TYPES.map((dt) => ({
        driverProfileId: dp.id, type: dt.t as any,
        url: dt.t === "SELFIE" ? avatar(40 + i) : doc(`${d.slug}-${dt.tag}`),
      })),
    });

    if (isApproved) {
      const withdrawable = 200000 + i * 350000;
      const wallet = await prisma.driverWallet.create({
        data: { driverProfileId: dp.id, withdrawableBalance: withdrawable, pendingBalance: 80000 + i * 25000 },
      });
      // vài giao dịch ví
      await prisma.walletTransaction.createMany({
        data: [
          { walletId: wallet.id, amount: net(380000), type: "TRIP_CREDIT", description: "Hoàn tất chuyến TP.HCM → Vũng Tàu", availableAt: dAgo(2), releasedAt: dAgo(2), createdAt: dAgo(5) },
          { walletId: wallet.id, amount: net(420000), type: "TRIP_CREDIT", description: "Hoàn tất chuyến nội thành", availableAt: dAgo(1), releasedAt: dAgo(1), createdAt: dAgo(3) },
          { walletId: wallet.id, amount: 50000,       type: "ADJUSTMENT",   description: "Thưởng chuỗi chuyến (streak bonus)", createdAt: dAgo(1) },
        ],
      });
      await prisma.driverStreak.create({
        data: { driverProfileId: dp.id, currentStreak: 2 + i, longestStreak: 5 + i, lastTripDate: dAgo(1), bonusEarnedTotal: 50000 * (i + 1) },
      });
      // tuyến đang chạy
      const dest = [PL.vungtau, PL.dalat, PL.hue, PL.nhatrang, PL.ninhkieu][i % 5];
      await prisma.driverRoute.create({
        data: {
          driverProfileId: dp.id,
          originAddress: city.addr, destAddress: dest.addr,
          originLat: city.lat, originLng: city.lng, destLat: dest.lat, destLng: dest.lng,
          departureTime: hNext(6 + i * 2), availableSeats: Math.max(1, d.seats - 1),
          maxDetourKm: 12, allowCargo: d.allowCargo, cargoCapacityKg: d.cargoKg, status: "ACTIVE",
        },
      });
    }
    drivers.push({ user, dpId: dp.id, seats: d.seats, fullName: d.fullName, status: d.status, online: d.online });
  }
  console.log(`🚗 ${drivers.length} tài xế (5 APPROVED, 2 PENDING, 1 REJECTED).`);

  const approved = drivers.filter((d) => d.status === "APPROVED");

  // ── Đặt chuyến (TripRequest) ────────────────────────────────────────────────
  // d = index tài xế (trong drivers) nếu đã ghép; trip=true → tạo chuyến hoàn tất.
  const TRIPS: any[] = [
    { c: 0,  from: "tsn",      to: "vungtau",  seats: 2, depH:  5,  price: 380000, dist: 95,  dur: 110, status: "PENDING",   note: "Có 1 vali lớn." },
    { c: 1,  from: "benthanh", to: "dalat",    seats: 1, depH:  8,  price: 520000, dist: 300, dur: 360, status: "PENDING" },
    { c: 2,  from: "q7",       to: "bienhoa",  seats: 3, depH:  3,  price: 220000, dist: 35,  dur: 55,  status: "PENDING",   mode: "DIRECT_BOOK", d: 0 },
    { c: 3,  from: "noibai",   to: "hoankiem", seats: 2, depH:  2,  price: 280000, dist: 28,  dur: 45,  status: "PENDING",   note: "Đón tại ga đến quốc nội." },
    { c: 4,  from: "mydinh",   to: "hue",      seats: 1, depH: 12,  price: 650000, dist: 660, dur: 720, status: "PENDING" },
    { c: 5,  from: "dnair",    to: "hue",      seats: 4, depH:  4,  price: 480000, dist: 95,  dur: 120, status: "PENDING" },

    { c: 6,  from: "tsn",      to: "vungtau",  seats: 2, depH: -20, price: 380000, dist: 95,  dur: 110, status: "MATCHED", d: 0, trip: true },
    { c: 7,  from: "benthanh", to: "ninhkieu", seats: 1, depH: -44, price: 420000, dist: 170, dur: 210, status: "MATCHED", d: 4, trip: true },
    { c: 8,  from: "hoankiem", to: "noibai",   seats: 2, depH: -28, price: 290000, dist: 28,  dur: 50,  status: "MATCHED", d: 2, trip: true },
    { c: 9,  from: "mykhe",    to: "dnair",    seats: 3, depH: -52, price: 180000, dist: 12,  dur: 25,  status: "MATCHED", d: 3, trip: true },
    { c: 10, from: "q7",       to: "binhduong",seats: 2, depH:  6,  price: 260000, dist: 40,  dur: 70,  status: "MATCHED", d: 1 },

    { c: 11, from: "tsn",      to: "phanthiet",seats: 2, depH: -6,  price: 700000, dist: 220, dur: 270, status: "CANCELLED" },
    { c: 0,  from: "bmd",      to: "nhatrang", seats: 1, depH: -8,  price: 600000, dist: 430, dur: 480, status: "CANCELLED" },
    { c: 1,  from: "benthanh", to: "vungtau",  seats: 4, depH: -30, price: 450000, dist: 100, dur: 120, status: "EXPIRED" },
    { c: 2,  from: "mydinh",   to: "hoankiem", seats: 1, depH: -36, price: 90000,  dist: 10,  dur: 25,  status: "EXPIRED" },
  ];

  const reqRows: any[] = [];
  for (const t of TRIPS) {
    const from = PL[t.from], to = PL[t.to];
    const dep = hNext(t.depH);
    const cust = customers[t.c];
    const req = await prisma.tripRequest.create({
      data: {
        customerId: cust.id, passengerName: cust.fullName, passengerPhone: cust.phone, note: t.note ?? null,
        pickupAddress: from.addr, pickupLat: from.lat, pickupLng: from.lng,
        dropoffAddress: to.addr, dropoffLat: to.lat, dropoffLng: to.lng,
        departureTime: dep, seats: t.seats, cargoWeightKg: t.cargo ?? null,
        bookingMode: (t.mode ?? "OPEN_WAIT") as any,
        quotedPrice: t.price, distanceKm: t.dist, durationMin: t.dur,
        status: t.status as any, expiresAt: new Date(dep.getTime() + 30 * 60000),
        createdAt: hAgo(t.depH < 0 ? -t.depH + 6 : 6),
      },
    });
    reqRows.push({ req, t, from, to, cust });
  }
  console.log(`🧾 ${reqRows.length} đặt chuyến (6 đang chờ, 5 đã ghép, 2 hủy, 2 hết hạn).`);

  // ── Ghép chuyến + chuyến hoàn tất + thanh toán + đánh giá ────────────────────
  let tripCount = 0;
  for (const { req, t, from, to, cust } of reqRows) {
    if (t.d == null) continue;
    const drv = drivers[t.d];
    const fareShare = t.price;
    const match = await prisma.tripMatch.create({
      data: {
        requestId: req.id, driverProfileId: drv.dpId, detourKm: 3 + (t.dist % 7),
        fareShare, driverNet: net(fareShare),
        status: t.trip ? "ACCEPTED" : "OFFERED",
        offeredAt: hAgo(t.depH < 0 ? -t.depH + 2 : 1),
        respondedAt: t.trip ? hAgo(t.depH < 0 ? -t.depH + 1.5 : 0) : null,
        expiresAt: new Date(req.departureTime.getTime() + 30 * 60000),
      },
    });

    if (!t.trip) continue;
    const trip = await prisma.trip.create({
      data: {
        driverProfileId: drv.dpId, status: "COMPLETED", seatsTotal: drv.seats, seatsFilled: t.seats,
        optimizedAt: hAgo(-t.depH + 1), startedAt: req.departureTime, completedAt: new Date(req.departureTime.getTime() + t.dur * 60000),
        createdAt: hAgo(-t.depH + 2),
      },
    });
    await prisma.tripPassenger.create({
      data: { tripId: trip.id, requestId: req.id, customerId: cust.id, seats: t.seats, pickupOrder: 1, dropoffOrder: 1, legStatus: "DROPPED", fareShare },
    });
    await prisma.tripStop.createMany({
      data: [
        { tripId: trip.id, passengerId: cust.id, order: 1, type: "PICKUP",  address: from.addr, lat: from.lat, lng: from.lng, status: "DONE", etaAt: req.departureTime, doneAt: req.departureTime },
        { tripId: trip.id, passengerId: cust.id, order: 2, type: "DROPOFF", address: to.addr,   lat: to.lat,   lng: to.lng,   status: "DONE", etaAt: trip.completedAt, doneAt: trip.completedAt },
      ],
    });
    await prisma.payment.create({
      data: { tripId: trip.id, customerId: cust.id, amount: t.price, gateway: t.c % 2 ? "WALLET" : "PAYOS", status: "PAID", providerRef: `MOCK-${match.id.slice(-6)}`, paidAt: trip.completedAt },
    });
    // đánh giá hai chiều
    const stars = [5, 5, 4, 5][tripCount % 4];
    await prisma.rating.create({ data: { tripId: trip.id, giverId: cust.id, receiverId: drv.user.id, stars, comment: ["Tài xế thân thiện, xe sạch sẽ!", "Đúng giờ, lái an toàn.", "Ổn, sẽ đi lại.", "Rất hài lòng, 5 sao!"][tripCount % 4] } });
    await prisma.rating.create({ data: { tripId: trip.id, giverId: drv.user.id, receiverId: cust.id, stars: 5, comment: "Khách lịch sự, đúng hẹn." } });
    tripCount++;
  }
  console.log(`✅ ${tripCount} chuyến hoàn tất (có thanh toán + đánh giá).`);

  // ── Đặt hàng (CargoRequest) ─────────────────────────────────────────────────
  const CARGO: any[] = [
    { s: 0, from: "benthanh", to: "vungtau",  kg: 12, price: 150000, status: "PENDING",   desc: "Thùng quà sinh nhật, dễ vỡ.", rcv: "Anh Khoa", rphone: "0905551001" },
    { s: 3, from: "q7",       to: "binhduong",kg: 25, price: 220000, status: "PENDING",   desc: "2 thùng linh kiện điện tử.",  rcv: "Chị Trang", rphone: "0905551002" },
    { s: 6, from: "tsn",      to: "dalat",    kg: 8,  price: 180000, status: "MATCHED",   desc: "Hộp thuốc, giữ mát.",          rcv: "Bác Hùng", rphone: "0905551003" },
    { s: 8, from: "hoankiem", to: "noibai",   kg: 5,  price: 90000,  status: "DELIVERED", desc: "Tài liệu hợp đồng gấp.",       rcv: "Anh Dũng", rphone: "0905551004" },
    { s: 2, from: "dnair",    to: "hue",      kg: 40, price: 350000, status: "CANCELLED", desc: "Đặc sản miền Trung.",          rcv: "Chị Lan",  rphone: "0905551005" },
  ];
  for (const cg of CARGO) {
    const from = PL[cg.from], to = PL[cg.to];
    await prisma.cargoRequest.create({
      data: {
        senderId: customers[cg.s].id, receiverName: cg.rcv, receiverPhone: cg.rphone,
        pickupAddress: from.addr, pickupLat: from.lat, pickupLng: from.lng,
        dropoffAddress: to.addr, dropoffLat: to.lat, dropoffLng: to.lng,
        weightKg: cg.kg, description: cg.desc, quotedPrice: cg.price, status: cg.status as any,
        deliveredAt: cg.status === "DELIVERED" ? hAgo(20) : null,
        assignedAt: ["MATCHED", "DELIVERED"].includes(cg.status) ? hAgo(30) : null,
        expiresAt: hNext(24), createdAt: hAgo(12),
      },
    });
  }
  console.log(`📦 ${CARGO.length} đơn hàng (đặt hàng).`);

  // ── Báo cáo (Report) ────────────────────────────────────────────────────────
  const REPORTS: any[] = [
    { by: 0, about: "d0", reason: "Tài xế đến trễ",                  desc: "Tài xế đến muộn 25 phút so với giờ hẹn, không báo trước.",      status: "OPEN" },
    { by: 1, about: "d1", reason: "Lái xe ẩu, vượt tốc độ",          desc: "Tài xế chạy quá tốc độ trên cao tốc, gây cảm giác bất an.",     status: "OPEN" },
    { by: 2, about: "d2", reason: "Thu thêm phí ngoài thỏa thuận",   desc: "Tài xế yêu cầu trả thêm 100k tiền cầu đường ngoài giá báo.",    status: "OPEN" },
    { by: 3, about: "d3", reason: "Xe không đúng như đăng ký",       desc: "Đăng ký xe 7 chỗ nhưng tới đón bằng xe 4 chỗ.",                status: "OPEN" },
    { by: 4, about: "d0", reason: "Thái độ không lịch sự",           desc: "Tài xế cau có, nói chuyện thiếu lịch sự với hành khách.",       status: "INVESTIGATING" },
    { by: 5, about: "d4", reason: "Hủy chuyến phút chót",            desc: "Tài xế hủy chuyến trước giờ khởi hành 10 phút.",               status: "INVESTIGATING" },
    { by: 6, about: "d1", reason: "Hút thuốc trong xe",              desc: "Trong xe có mùi thuốc lá nồng nặc, tài xế hút khi đang chạy.",  status: "RESOLVED", note: "Đã nhắc nhở tài xế, cảnh cáo lần 1. Khách được tặng voucher 50k.", resolved: true },
    { by: 7, about: "d2", reason: "Tài xế đến trễ",                  desc: "Trễ 15 phút nhưng có báo trước và xin lỗi.",                   status: "RESOLVED", note: "Lý do kẹt xe hợp lý, đã giải thích với khách.", resolved: true },
    { by: 8, about: "d3", reason: "Lái xe ẩu, vượt tốc độ",          desc: "Phản ánh chung chung, không có bằng chứng cụ thể.",            status: "DISMISSED", note: "Không đủ căn cứ, không có dữ liệu hành trình bất thường." },
    // tài xế báo cáo khách (no-show)
    { byDriver: "d0", aboutCust: 9, reason: "Hành khách không có mặt (no-show)", desc: "Khách đặt chuyến nhưng không ra điểm đón, không nghe máy.", status: "OPEN" },
    { byDriver: "d2", aboutCust: 10, reason: "Khách hủy sau khi tài xế đã tới",   desc: "Tài xế đã tới điểm đón thì khách báo hủy, không bồi thường.", status: "INVESTIGATING" },
  ];
  const dByKey = (k: string) => drivers[Number(k.slice(1))];
  for (const r of REPORTS) {
    const reporterId = r.byDriver != null ? dByKey(r.byDriver).user.id : customers[r.by].id;
    const reportedUserId = r.aboutCust != null ? customers[r.aboutCust].id : dByKey(r.about).user.id;
    await prisma.report.create({
      data: {
        reporterId, reportedUserId, reason: r.reason, description: r.desc,
        evidenceUrls: r.status === "OPEN" && r.by != null ? [doc(`evidence-${r.by}-${r.about}`)] : [],
        status: r.status as any, adminNote: r.note ?? null,
        resolvedAt: r.resolved ? hAgo(6) : null, createdAt: hAgo(18),
      },
    });
  }
  console.log(`🚩 ${REPORTS.length} báo cáo (4 OPEN, 3 đang xử lý, 2 đã giải quyết, 1 bác bỏ + khách/tài xế).`);

  // ── Yêu cầu rút tiền (WithdrawalRequest) ────────────────────────────────────
  const WD: any[] = [
    { d: 0, amount: 300000,  status: "PENDING" },
    { d: 1, amount: 500000,  status: "PENDING" },
    { d: 2, amount: 1000000, status: "PENDING" },
    { d: 3, amount: 250000,  status: "APPROVED" },
    { d: 4, amount: 750000,  status: "PROCESSING" },
    { d: 0, amount: 200000,  status: "DONE", note: "Đã chuyển khoản thành công." },
    { d: 1, amount: 400000,  status: "DONE", note: "Đã chuyển khoản thành công." },
    { d: 2, amount: 150000,  status: "REJECTED", note: "Sai thông tin tài khoản ngân hàng, vui lòng kiểm tra lại." },
  ];
  for (let i = 0; i < WD.length; i++) {
    const w = WD[i];
    const drv = approved[w.d];
    const done = ["DONE", "REJECTED", "APPROVED", "PROCESSING"].includes(w.status);
    await prisma.withdrawalRequest.create({
      data: {
        driverProfileId: drv.dpId, amount: w.amount, bankName: BANKS[i % BANKS.length],
        bankAccountNo: `0${(12340000 + i * 1111).toString()}`,
        bankAccountName: drv.fullName.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d"),
        status: w.status as any, adminNote: w.note ?? null,
        processedAt: done && w.status !== "PENDING" ? hAgo(8) : null, createdAt: hAgo(24 + i),
      },
    });
  }
  console.log(`💸 ${WD.length} yêu cầu rút tiền (3 chờ duyệt, các trạng thái khác).`);

  // ── Thông báo (NotificationLog) ─────────────────────────────────────────────
  const NOTIS: any[] = [
    { u: customers[0].id, event: "TRIP_MATCHED",        ch: "IN_APP", msg: "Chuyến TP.HCM → Vũng Tàu của bạn đã được ghép tài xế Trần Văn Hùng." },
    { u: customers[6].id, event: "TRIP_COMPLETED",      ch: "EMAIL",  msg: "Chuyến đi đã hoàn tất. Hãy đánh giá tài xế!" },
    { u: drivers[0].user.id, event: "NEW_REQUEST",      ch: "PUSH",   msg: "Có yêu cầu chuyến mới gần bạn: Q7 → Biên Hòa." },
    { u: drivers[2].user.id, event: "WITHDRAWAL_PENDING",ch: "IN_APP", msg: "Yêu cầu rút 1.000.000đ của bạn đang chờ duyệt." },
    { u: drivers[3].user.id, event: "WITHDRAWAL_DONE",  ch: "EMAIL",  msg: "Yêu cầu rút 250.000đ đã được duyệt." },
    { u: drivers[5].user.id, event: "KYC_PENDING",      ch: "IN_APP", msg: "Hồ sơ KYC của bạn đang được xét duyệt." },
    { u: drivers[7].user.id, event: "KYC_REJECTED",     ch: "EMAIL",  msg: "Hồ sơ KYC bị từ chối: ảnh CCCD mặt sau mờ." },
    { u: customers[9].id, event: "REPORT_FILED",        ch: "IN_APP", msg: "Bạn đã bị báo cáo: vắng mặt tại điểm đón. Vui lòng kiểm tra." },
  ];
  for (const n of NOTIS) {
    await prisma.notificationLog.create({
      data: { userId: n.u, event: n.event, channel: n.ch as any, status: "SENT", payload: { message: n.msg }, createdAt: hAgo(10) },
    });
  }
  console.log(`🔔 ${NOTIS.length} thông báo.`);

  console.log("\n🎉 SEED MOCK XONG! Đăng nhập bất kỳ tài khoản nào với mật khẩu: Mock@12345");
  console.log("   Ví dụ khách : an.nguyen@tc-mock.vn");
  console.log("   Ví dụ tài xế: hung.tran@tc-mock.vn (đã duyệt) | tai.ho@tc-mock.vn (chờ KYC) | luc.cao@tc-mock.vn (bị từ chối)");
  console.log("   Xem toàn bộ ở admin: admin-test@thuanchuyen.local / Test@12345");
}

main()
  .catch((e) => { console.error("❌ SEED LỖI:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
