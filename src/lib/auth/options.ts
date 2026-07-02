import { compare } from "bcryptjs";
import { createHash } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { prisma } from "@/lib/db/prisma";
import { buildAdapter } from "./adapter";
import { checkBruteForce, recordLoginAttempt } from "@/lib/security/brute-force";

export const authOptions: NextAuthOptions = {
  adapter: buildAdapter(),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    // ── Google OAuth (chỉ kích hoạt khi có credentials) ─────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),

    // ── Facebook OAuth (chỉ kích hoạt khi có credentials) ───────────────────
    ...(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
      ? [FacebookProvider({
          clientId: process.env.FACEBOOK_APP_ID,
          clientSecret: process.env.FACEBOOK_APP_SECRET,
          // next-auth v4 mặc định dùng Graph API v11.0 (2021, quá cũ) → nâng lên v23.0.
          authorization: "https://www.facebook.com/v23.0/dialog/oauth?scope=email",
        })]
      : []),

    // ── Email OTP (6 chữ số, gửi qua Resend) ────────────────────────────────
    CredentialsProvider({
      id: "email-otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp:   { label: "Mã OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        const codeHash = createHash("sha256")
          .update(credentials.otp.trim())
          .digest("hex");

        const record = await prisma.emailOtp.findFirst({
          where: {
            email: credentials.email,
            used: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });

        if (!record) throw new Error("Mã OTP không hợp lệ hoặc đã hết hạn");
        if (record.attempts >= 5) throw new Error("Đã nhập sai quá 5 lần");

        if (record.codeHash !== codeHash) {
          await prisma.emailOtp.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
          });
          throw new Error("Mã OTP không chính xác");
        }

        await prisma.emailOtp.update({
          where: { id: record.id },
          data: { used: true },
        });

        // Tạo user nếu chưa có
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          user = await prisma.user.create({
            data: { email: credentials.email, role: "CUSTOMER" },
          });
        }
        if (user.isBlocked) throw new Error("Tài khoản đã bị khóa");

        return {
          id: user.id,
          email: user.email ?? "",
          name: user.fullName,
          image: user.avatarUrl,
        };
      },
    }),

    // ── Email + Mật khẩu ────────────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email & Mật khẩu",
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
        ip:       { label: "IP", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Extract real IP from request headers (server-side, not spoofable by client)
        const headers = req?.headers as Record<string, string | string[]> | undefined;
        const getHeader = (name: string) => {
          const v = headers?.[name];
          return Array.isArray(v) ? v[0] : v;
        };
        const ip = getHeader("cf-connecting-ip")
          ?? getHeader("x-real-ip")
          ?? (getHeader("x-forwarded-for") ?? "").split(",")[0].trim()
          ?? "unknown";

        // Brute-force check
        const bf = await checkBruteForce(ip, credentials.email);
        if (bf.blocked) throw new Error(bf.reason ?? "Tài khoản tạm khóa");

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.passwordHash) {
          void recordLoginAttempt(ip, credentials.email, false);
          throw new Error("Email chưa đăng ký mật khẩu");
        }
        if (user.isBlocked) throw new Error("Tài khoản đã bị khóa");

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) {
          void recordLoginAttempt(ip, credentials.email, false);
          throw new Error("Mật khẩu không đúng");
        }

        void recordLoginAttempt(ip, credentials.email, true);
        return {
          id: user.id,
          email: user.email ?? "",
          name: user.fullName,
          image: user.avatarUrl,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      // Luôn refresh role từ DB để đảm bảo tính chính xác
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { role: true, isBlocked: true, phone: true },
        });
        token.role  = dbUser?.role  ?? "CUSTOMER";
        token.phone = dbUser?.phone ?? null;
        if (dbUser?.isBlocked) token.blocked = true;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id    = token.userId as string;
      session.user.role  = token.role  as string;
      session.user.phone = token.phone as string | null | undefined;
      return session;
    },
  },
};
