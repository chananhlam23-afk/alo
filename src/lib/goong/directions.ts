const GOONG_BASE = process.env.GOONG_API_BASE_URL ?? "https://rsapi.goong.io";

export interface GoongRoute {
  distanceKm: number;
  durationMin: number;
  polylineEncoded: string;
}

export interface GoongDistanceCell {
  distanceM: number;
  durationS: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function haversineFallback(
  originLat: number, originLng: number,
  destLat: number, destLng: number,
): GoongRoute {
  const distanceKm = haversineKm(originLat, originLng, destLat, destLng);
  return {
    distanceKm,
    durationMin: Math.ceil((distanceKm / 60) * 60),
    polylineEncoded: "",
  };
}

export async function getDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
): Promise<GoongRoute> {
  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) return haversineFallback(originLat, originLng, destLat, destLng);

  try {
    const url = new URL(`${GOONG_BASE}/Direction`);
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${destLat},${destLng}`);
    url.searchParams.set("vehicle", "car");
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return haversineFallback(originLat, originLng, destLat, destLng);

    const json = await res.json();
    const leg = json.routes[0].legs[0];
    return {
      distanceKm: leg.distance.value / 1000,
      durationMin: Math.ceil(leg.duration.value / 60),
      polylineEncoded: json.routes[0].overview_polyline.points,
    };
  } catch {
    return haversineFallback(originLat, originLng, destLat, destLng);
  }
}

export async function getDistanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>,
): Promise<GoongDistanceCell[][]> {
  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) {
    return origins.map((o) =>
      destinations.map((d) => ({
        distanceM: Math.round(haversineKm(o.lat, o.lng, d.lat, d.lng) * 1000),
        durationS: Math.round((haversineKm(o.lat, o.lng, d.lat, d.lng) / 60) * 3600),
      })),
    );
  }

  try {
    const originStr = origins.map((p) => `${p.lat},${p.lng}`).join("|");
    const destStr = destinations.map((p) => `${p.lat},${p.lng}`).join("|");

    const url = new URL(`${GOONG_BASE}/DistanceMatrix`);
    url.searchParams.set("origins", originStr);
    url.searchParams.set("destinations", destStr);
    url.searchParams.set("vehicle", "car");
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`Goong DistanceMatrix error: ${res.status}`);

    const json = await res.json();
    return json.rows.map((row: { elements: Array<{ distance: { value: number }; duration: { value: number } }> }) =>
      row.elements.map((el: { distance: { value: number }; duration: { value: number } }) => ({
        distanceM: el.distance.value,
        durationS: el.duration.value,
      })),
    );
  } catch {
    return origins.map((o) =>
      destinations.map((d) => ({
        distanceM: Math.round(haversineKm(o.lat, o.lng, d.lat, d.lng) * 1000),
        durationS: Math.round((haversineKm(o.lat, o.lng, d.lat, d.lng) / 60) * 3600),
      })),
    );
  }
}
