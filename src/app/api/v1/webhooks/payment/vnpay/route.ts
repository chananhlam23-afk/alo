import { NextResponse } from "next/server";

// VNPay không còn được sử dụng. Chỉ dùng PayOS.
export async function POST() {
  return NextResponse.json({ error: "Endpoint không còn hoạt động" }, { status: 410 });
}
export async function GET() {
  return NextResponse.json({ error: "Endpoint không còn hoạt động" }, { status: 410 });
}
