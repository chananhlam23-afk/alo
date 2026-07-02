-- Bộ điều kiện áp dụng nâng cao cho voucher (đối tượng, phạm vi, giới hạn, ngân sách...)
ALTER TABLE "vouchers" ADD COLUMN IF NOT EXISTS "conditions" JSONB NOT NULL DEFAULT '{}';
