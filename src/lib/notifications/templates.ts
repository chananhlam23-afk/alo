import type { NotificationEvent } from "@/types/enums";

export interface NotificationTemplate {
  subject?: string;
  emailHtml: (data: Record<string, string>) => string;
  zaloTemplateId: string;
  zaloData: (data: Record<string, string>) => Record<string, string>;
}

const templates: Record<NotificationEvent, NotificationTemplate> = {
  TRIP_REQUEST_CREATED: {
    subject: "Đặt chuyến thành công",
    emailHtml: (d) => `
      <h2>Đặt chuyến thành công 🎉</h2>
      <p>Xin chào <strong>${d.passengerName}</strong>, yêu cầu đặt chuyến của bạn đã được ghi nhận.</p>
      <p><strong>Điểm đón:</strong> ${d.pickup}</p>
      <p><strong>Điểm đến:</strong> ${d.dropoff}</p>
      <p><strong>Thời gian:</strong> ${d.departureTime}</p>
      <p><strong>Giá tạm tính:</strong> ${d.price}đ</p>
      <p>Chúng tôi đang tìm tài xế phù hợp và sẽ báo bạn ngay khi có tài xế nhận chuyến.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_BOOKED ?? "",
    zaloData: (d) => ({
      customer_name: d.passengerName,
      pickup: d.pickup,
      dropoff: d.dropoff,
      time: d.departureTime,
      price: d.price,
    }),
  },

  CARGO_REQUEST_CREATED: {
    subject: "Đặt gửi hàng thành công",
    emailHtml: (d) => `
      <h2>Đặt gửi hàng thành công 📦</h2>
      <p>Yêu cầu gửi hàng của bạn đã được ghi nhận.</p>
      <p><strong>Điểm lấy:</strong> ${d.pickup}</p>
      <p><strong>Điểm giao:</strong> ${d.dropoff}</p>
      <p><strong>Người nhận:</strong> ${d.receiverName}</p>
      <p><strong>Khối lượng:</strong> ${d.weightKg} kg</p>
      <p><strong>Cước tạm tính:</strong> ${d.price}đ</p>
      <p>Chúng tôi đang tìm tài xế phù hợp để vận chuyển hàng của bạn.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_CARGO_BOOKED ?? "",
    zaloData: (d) => ({
      pickup: d.pickup,
      dropoff: d.dropoff,
      receiver_name: d.receiverName,
      weight: d.weightKg,
      price: d.price,
    }),
  },

  TRIP_ACCEPTED: {
    subject: "Tài xế đã nhận cuốc của bạn",
    emailHtml: (d) => `
      <h2>Cuốc xe đã được nhận!</h2>
      <p>Tài xế <strong>${d.driverName}</strong> (${d.plate}) đã nhận cuốc của bạn.</p>
      <p>Khởi hành: <strong>${d.departureTime}</strong></p>
      <p>Bạn là hành khách số <strong>${d.pickupOrder}</strong> trên ${d.totalPassengers} người.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_ACCEPTED ?? "",
    zaloData: (d) => ({
      driver_name: d.driverName,
      plate: d.plate,
      departure_time: d.departureTime,
      pickup_order: d.pickupOrder,
    }),
  },

  DIRECT_BOOK_REQUESTED: {
    subject: "Bạn có yêu cầu đặt xe mới",
    emailHtml: (d) => `
      <h2>Yêu cầu đặt xe trực tiếp</h2>
      <p>Khách <strong>${d.customerName}</strong> muốn đặt xe với bạn.</p>
      <p>Từ: ${d.pickup} → ${d.dropoff}</p>
      <p>Giờ: ${d.departureTime}</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_ACCEPTED ?? "",
    zaloData: (d) => ({
      customer_name: d.customerName,
      pickup: d.pickup,
      dropoff: d.dropoff,
    }),
  },

  PAYMENT_SUCCESS: {
    subject: "Thanh toán thành công",
    emailHtml: (d) => `
      <h2>Thanh toán thành công</h2>
      <p>Số tiền: <strong>${d.amount} VND</strong></p>
      <p>Mã giao dịch: ${d.providerRef}</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_PAYMENT_SUCCESS ?? "",
    zaloData: (d) => ({ amount: d.amount, provider_ref: d.providerRef }),
  },

  TRIP_STARTED: {
    subject: "🚗 Tài xế đang trên đường đến đón bạn",
    emailHtml: (d) => `
      <!DOCTYPE html>
      <html lang="vi">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif">
        <div style="max-width:520px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🚗</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Tài xế đang đến đón bạn!</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Chuyến xe Thuận Chuyến của bạn đã bắt đầu</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px">
            <p style="color:#94a3b8;font-size:14px;margin:0 0 20px">Xin chào <strong style="color:#e2e8f0">${d.passengerName}</strong>,</p>

            <!-- Driver card -->
            <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:20px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px">🧑‍✈️</div>
                <div>
                  <div style="color:#e2e8f0;font-weight:700;font-size:15px">${d.driverName}</div>
                  <div style="color:#6366f1;font-weight:700;font-size:13px;margin-top:2px">🚘 ${d.plate}</div>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div style="background:#1e293b;border-radius:8px;padding:12px">
                  <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Điểm đón</div>
                  <div style="color:#e2e8f0;font-size:12px;line-height:1.4">${d.pickupAddress}</div>
                </div>
                <div style="background:#1e293b;border-radius:8px;padding:12px">
                  <div style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Điểm trả</div>
                  <div style="color:#e2e8f0;font-size:12px;line-height:1.4">${d.dropoffAddress}</div>
                </div>
              </div>
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:20px">
              <a href="${d.trackingUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px">
                📍 Xem lộ trình tài xế
              </a>
            </div>

            <p style="color:#64748b;font-size:12px;text-align:center;margin:0">
              Bạn là hành khách số <strong style="color:#a78bfa">${d.pickupOrder}</strong> được đón trên lộ trình.
              Vui lòng chuẩn bị sẵn sàng ở điểm đón.
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#0f172a;padding:16px 32px;text-align:center;border-top:1px solid #1e293b">
            <p style="color:#475569;font-size:11px;margin:0">Thuận Chuyến · Ghép chuyến xe liên tỉnh</p>
          </div>
        </div>
      </body>
      </html>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_STARTED ?? "",
    zaloData: (d) => ({
      driver_name: d.driverName,
      plate: d.plate,
      pickup_address: d.pickupAddress,
      tracking_url: d.trackingUrl,
    }),
  },

  TRIP_COMPLETED: {
    subject: "Chuyến đi hoàn thành",
    emailHtml: (d) => `
      <h2>Chuyến đi hoàn thành</h2>
      <p>Cảm ơn bạn đã sử dụng Thuận Chuyến!</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_COMPLETED ?? "",
    zaloData: () => ({}),
  },

  WALLET_CREDIT: {
    subject: "Tiền đã vào ví",
    emailHtml: (d) => `
      <h2>Ví của bạn vừa được cộng tiền</h2>
      <p>Số tiền: <strong>${d.amount} VND</strong></p>
      <p>${d.description}</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_WALLET_CREDIT ?? "",
    zaloData: (d) => ({ amount: d.amount, description: d.description }),
  },

  WITHDRAWAL_APPROVED: {
    subject: "Yêu cầu rút tiền được duyệt",
    emailHtml: (d) => `
      <h2>Yêu cầu rút tiền đã được duyệt</h2>
      <p>Số tiền: <strong>${d.amount} VND</strong> sẽ được chuyển vào tài khoản của bạn.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_WALLET_CREDIT ?? "",
    zaloData: (d) => ({ amount: d.amount }),
  },

  WITHDRAWAL_REJECTED: {
    subject: "Yêu cầu rút tiền bị từ chối",
    emailHtml: (d) => `
      <h2>Yêu cầu rút tiền bị từ chối</h2>
      <p>Lý do: ${d.reason}</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_KYC_RESULT ?? "",
    zaloData: (d) => ({ reason: d.reason }),
  },

  KYC_APPROVED: {
    subject: "Hồ sơ KYC được duyệt",
    emailHtml: () => `
      <h2>Chúc mừng! Hồ sơ KYC của bạn đã được duyệt.</h2>
      <p>Bạn có thể bắt đầu nhận chuyến ngay bây giờ.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_KYC_RESULT ?? "",
    zaloData: () => ({ status: "APPROVED" }),
  },

  KYC_REJECTED: {
    subject: "Hồ sơ KYC bị từ chối",
    emailHtml: (d) => `
      <h2>Hồ sơ KYC của bạn bị từ chối</h2>
      <p>Lý do: ${d.reason}</p>
      <p>Vui lòng cập nhật lại hồ sơ và gửi lại.</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_KYC_RESULT ?? "",
    zaloData: (d) => ({ status: "REJECTED", reason: d.reason }),
  },

  CARGO_MATCHED: {
    subject: "Yêu cầu hàng hóa được ghép",
    emailHtml: (d) => `
      <h2>Yêu cầu hàng hóa của bạn đã được ghép!</h2>
      <p>Tài xế <strong>${d.driverName}</strong> (${d.plate}) sẽ vận chuyển hàng của bạn.</p>
      <p>Từ: ${d.pickup} → ${d.dropoff}</p>
    `,
    zaloTemplateId: process.env.ZALO_ZNS_TEMPLATE_TRIP_ACCEPTED ?? "",
    zaloData: (d) => ({ driver_name: d.driverName, plate: d.plate, pickup: d.pickup, dropoff: d.dropoff }),
  },
};

export function getTemplate(event: NotificationEvent): NotificationTemplate {
  return templates[event];
}
