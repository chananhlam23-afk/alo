import { getDistanceMatrix } from "@/lib/goong/directions";

export interface StopPoint {
  id: string;
  tripPassengerId: string;
  type: "PICKUP" | "DROPOFF";
  lat: number;
  lng: number;
  address: string;
  seats: number;
}

export interface OptimizedStop extends StopPoint {
  order: number;
  pickupOrder?: number;
}

/**
 * Nearest-neighbor greedy dùng Goong DistanceMatrix (đường thực tế).
 * Ràng buộc: DROPOFF_i chỉ được thăm sau khi PICKUP_i của cùng khách đã được thăm.
 * Fallback về Haversine nếu Goong API lỗi.
 */
export async function heuristicOptimize(
  stops: StopPoint[],
  driverLat: number,
  driverLng: number,
): Promise<OptimizedStop[]> {
  if (stops.length === 0) return [];

  try {
    const allPoints = [
      { lat: driverLat, lng: driverLng },
      ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];
    const matrix = await getDistanceMatrix(allPoints, allPoints);

    const n = stops.length;
    const visited = new Set<number>();
    const order: number[] = [];
    let current = 0; // driver position = index 0 in matrix

    while (order.length < n) {
      let best = -1;
      let bestDuration = Infinity;

      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;
        if (stops[i].type === "DROPOFF") {
          const pickupIdx = stops.findIndex(
            (s) => s.tripPassengerId === stops[i].tripPassengerId && s.type === "PICKUP",
          );
          if (pickupIdx !== -1 && !visited.has(pickupIdx)) continue;
        }
        const duration = matrix[current][i + 1].durationS;
        if (duration < bestDuration) {
          bestDuration = duration;
          best = i;
        }
      }

      if (best === -1) break;
      visited.add(best);
      order.push(best);
      current = best + 1;
    }

    // Fallback nếu không sắp xếp được hết (không nên xảy ra)
    if (order.length < n) return haversineHeuristic(stops, driverLat, driverLng);

    let pickupOrder = 1;
    return order.map((idx, pos) => ({
      ...stops[idx],
      order: pos + 1,
      pickupOrder: stops[idx].type === "PICKUP" ? pickupOrder++ : undefined,
    }));
  } catch {
    return haversineHeuristic(stops, driverLat, driverLng);
  }
}

function haversineHeuristic(
  stops: StopPoint[],
  driverLat: number,
  driverLng: number,
): OptimizedStop[] {
  const sorted = [...stops].sort(
    (a, b) =>
      haversineDistance(driverLat, driverLng, a.lat, a.lng) -
      haversineDistance(driverLat, driverLng, b.lat, b.lng),
  );
  let pickupOrder = 1;
  return sorted.map((s, i) => ({
    ...s,
    order: i + 1,
    pickupOrder: s.type === "PICKUP" ? pickupOrder++ : undefined,
  }));
}

/**
 * Optimizer nâng cao: brute-force Pickup-and-Delivery TSP (N ≤ 6 khách → max 12 mốc).
 * Ràng buộc: DROPOFF_i phải đứng sau PICKUP_i của cùng khách.
 */
export async function tspOptimize(
  stops: StopPoint[],
  driverLat: number,
  driverLng: number,
): Promise<OptimizedStop[]> {
  const allPoints = [{ lat: driverLat, lng: driverLng }, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))];
  const matrix = await getDistanceMatrix(allPoints, allPoints);

  const n = stops.length;
  const pickupIndexOf: Record<string, number> = {};
  stops.forEach((s, i) => {
    if (s.type === "PICKUP") pickupIndexOf[s.tripPassengerId] = i;
  });

  let bestCost = Infinity;
  let bestPerm: number[] = [];

  const indices = stops.map((_, i) => i);
  for (const perm of permutations(indices)) {
    if (!satisfiesConstraints(perm, stops)) continue;

    let cost = matrix[0][perm[0] + 1].durationS;
    for (let i = 0; i < perm.length - 1; i++) {
      cost += matrix[perm[i] + 1][perm[i + 1] + 1].durationS;
    }

    if (cost < bestCost) {
      bestCost = cost;
      bestPerm = perm;
    }
  }

  if (bestPerm.length === 0) {
    return await heuristicOptimize(stops, driverLat, driverLng);
  }

  let pickupOrder = 1;
  return bestPerm.map((idx, order) => ({
    ...stops[idx],
    order: order + 1,
    pickupOrder: stops[idx].type === "PICKUP" ? pickupOrder++ : undefined,
  }));
}

function satisfiesConstraints(perm: number[], stops: StopPoint[]): boolean {
  const posOf: Record<number, number> = {};
  perm.forEach((idx, pos) => (posOf[idx] = pos));

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i];
    if (s.type === "DROPOFF") {
      const pickupIdx = stops.findIndex(
        (x) => x.tripPassengerId === s.tripPassengerId && x.type === "PICKUP",
      );
      if (pickupIdx !== -1 && posOf[pickupIdx] >= posOf[i]) return false;
    }
  }
  return true;
}

function* permutations(arr: number[]): Generator<number[]> {
  if (arr.length <= 1) {
    yield arr;
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) {
      yield [arr[i], ...p];
    }
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
