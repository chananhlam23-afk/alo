import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import type { AuthTokenPayload } from "@/types/api";

const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function signAccessToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as AuthTokenPayload;
}

export async function signRefreshToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as unknown as AuthTokenPayload;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return randomBytes(40).toString("hex");
}

export function refreshTokenExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}
