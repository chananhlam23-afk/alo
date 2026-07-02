/**
 * SMS Provider abstraction.
 * MVP: log OTP to console.
 * Production: swap to ESMS / Viettel / Twilio bằng cách implement SmsProvider interface.
 */

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.info(`[SMS OTP] Gửi tới ${phone}: ${code}`);
  }
}

class EsmsSmsProvider implements SmsProvider {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly brandname: string;

  constructor() {
    this.apiKey = process.env.ESMS_API_KEY ?? "";
    this.apiSecret = process.env.ESMS_API_SECRET ?? "";
    this.brandname = process.env.ESMS_BRANDNAME ?? "ThuanDuong";
  }

  async sendOtp(phone: string, code: string) {
    const url = process.env.ESMS_API_URL ?? "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get";
    const params = new URLSearchParams({
      ApiKey: this.apiKey,
      ApiSecret: this.apiSecret,
      Phone: phone,
      Content: `[ThuanDuong] Ma OTP cua ban la: ${code}. Co hieu luc 5 phut.`,
      SmsType: "2",
      Brandname: this.brandname,
      IsUnicode: "0",
    });

    const res = await fetch(`${url}?${params}`, { method: "GET" });
    const json = await res.json();
    if (json.CodeResult !== "100") {
      throw new Error(`ESMS error: ${json.ErrorMessage}`);
    }
  }
}

function createSmsProvider(): SmsProvider {
  if (process.env.SMS_PROVIDER === "esms" && process.env.ESMS_API_KEY) {
    return new EsmsSmsProvider();
  }
  return new ConsoleSmsProvider();
}

export const smsProvider = createSmsProvider();
