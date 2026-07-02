import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/db/prisma";

function toNextAuthUser(u: {
  id: string; email: string | null; fullName: string | null;
  avatarUrl: string | null; emailVerified: Date | null;
  [key: string]: unknown;
}) {
  return { ...u, name: u.fullName, image: u.avatarUrl };
}

/**
 * Wrapper around PrismaAdapter that maps fullName↔name and avatarUrl↔image
 * so NextAuth Google OAuth works with our custom User schema.
 */
export function buildAdapter(): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,

    createUser: async (data: { email: string; emailVerified: Date | null; name?: string | null; image?: string | null }) => {
      const user = await prisma.user.create({
        data: {
          email:         data.email,
          fullName:      data.name ?? null,
          avatarUrl:     data.image ?? null,
          emailVerified: data.emailVerified,
          role:          "CUSTOMER",
        },
      });
      return toNextAuthUser(user) as never;
    },

    getUser: async (id) => {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return null;
      return toNextAuthUser(user) as never;
    },

    getUserByEmail: async (email) => {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return null;
      return toNextAuthUser(user) as never;
    },

    getUserByAccount: async ({ providerAccountId, provider }) => {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      if (!account?.user) return null;
      return toNextAuthUser(account.user) as never;
    },

    updateUser: async ({ id, name, image, email, emailVerified }) => {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name  !== undefined && { fullName:  name }),
          ...(image !== undefined && { avatarUrl: image }),
          ...(email !== undefined && { email }),
          ...(emailVerified !== undefined && { emailVerified }),
        },
      });
      return toNextAuthUser(user) as never;
    },
  };
}
