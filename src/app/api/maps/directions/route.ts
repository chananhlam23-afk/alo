import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/context";
import { matchingRateLimit, checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/ip";

const latlng = z.string().regex(/^-?\d{1,3}(\.\d+)?,-?\d{1,3}(\.\d+)?$/);
const QuerySchema = z.object({ origin: latlng, destination: latlng });

type RouteResult = { polyline: string; distanceM: number; durationS: number };

// Goong đặt key mẫu "your-goong-server-api-key" trong .env — coi như CHƯA cấu hình.
function isRealGoongKey(k?: string): k is string {
  return !!k && !k.startsWith("your-");
}

// Goong Directions — chất lượng tốt cho Việt Nam, cần API key thật.
async function goongRoute(origin: string, destination: string, key: string): Promise<RouteResult | null> {
  const url = new URL("https://rsapi.goong.io/Direction");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("vehicle", "car");
  url.searchParams.set("api_key", key);

  const res = await fetch(url.toString());
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route?.overview_polyline?.points) return null;

  return {
    polyline: route.overview_polyline.points, // encoded polyline (precision 5)
    distanceM: route.legs.reduce((s: number, l: { distance: { value: number } }) => s + l.distance.value, 0),
    durationS: route.legs.reduce((s: number, l: { duration: { value: number } }) => s + l.duration.value, 0),
  };
}

// OSRM public demo — MIỄN PHÍ, KHÔNG cần key. Fallback keyless (đồng bộ với
// CartoDB tiles + Photon geocoding). Lưu ý: server demo có giới hạn, production
// nên dùng Goong (điền GOONG_API_KEY) hoặc self-host OSRM.
async function osrmRoute(origin: string, destination: string): Promise<RouteResult | null> {
  const [oLat, oLng] = origin.split(",");
  const [dLat, dLng] = destination.split(",");
  // OSRM dùng thứ tự lng,lat trên URL path (ngược với Goong lat,lng).
  const url =
    `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}` +
    `?overview=full&geometries=polyline`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (data?.code !== "Ok" || !route?.geometry) return null;

  return {
    polyline: route.geometry, // encoded polyline precision 5 (giống Google)
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
  };
}

export async function GET(req: NextRequest) {
  // Proxy có xác thực — tránh lộ/đốt quota key ra public.
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  const rl = await checkRateLimit(matchingRateLimit, `directions:${auth.payload.userId || getClientIp(req)}`);
  if (rl.limited) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const parsed = QuerySchema.safeParse({
    origin: searchParams.get("origin"),
    destination: searchParams.get("destination"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }
  const { origin, destination } = parsed.data;
  const goongKey = process.env.GOONG_API_KEY;

  try {
    // Ưu tiên Goong nếu có key thật; nếu không (hoặc Goong fail) → OSRM keyless.
    let result: RouteResult | null = null;
    if (isRealGoongKey(goongKey)) {
      result = await goongRoute(origin, destination, goongKey).catch(() => null);
    }
    if (!result) {
      result = await osrmRoute(origin, destination);
    }
    if (!result) {
      return NextResponse.json({ error: "NO_ROUTE" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "ROUTING_FAILED" }, { status: 502 });
  }
}
