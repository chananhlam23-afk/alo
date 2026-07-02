-- Liên kết lượt dùng voucher với yêu cầu chuyến (để hoàn lượt khi hủy + chống ghi trùng)
ALTER TABLE "voucher_usages" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "voucher_usages_requestId_key" ON "voucher_usages"("requestId");
