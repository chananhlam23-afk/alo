import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      phone?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    phone?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    blocked?: boolean;
    phone?: string | null;
    /** epoch ms lần cuối role/phone được đọc từ DB (để refresh định kỳ, không query mỗi request) */
    roleCheckedAt?: number;
  }
}
