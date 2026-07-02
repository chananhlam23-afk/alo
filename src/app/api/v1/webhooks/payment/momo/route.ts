import { NextResponse } from "next/server";

// MoMo không còn được sử dụng. Chỉ dùng PayOS.
export async function POST() {
  return NextResponse.json({ error: "Endpoint không còn hoạt động" }, { status: 410 });
}
