"use client";
import { useSession, signOut } from "next-auth/react";

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  phone?: string | null;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  const user: AuthUser | null = session?.user
    ? {
        id:       session.user.id,
        email:    session.user.email ?? null,
        fullName: session.user.name  ?? null,
        role:     session.user.role  ?? "CUSTOMER",
        phone:    session.user.phone ?? null,
      }
    : null;

  const logout = () => signOut({ callbackUrl: "/login" });

  return { user, loading, logout };
}
