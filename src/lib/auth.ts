import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

const allowedDomain = process.env.GOOGLE_WORKSPACE_DOMAIN;

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email ?? (profile as any)?.email;
      if (!email) return false;

      if (allowedDomain) {
        const domain = email.split("@")[1]?.toLowerCase();
        if (domain !== allowedDomain.toLowerCase()) return false;
      }

      await prisma.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: String(token.email) },
          select: { id: true },
        });
        if (dbUser) (token as any).userId = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).userId = (token as any).userId;
      return session;
    },
  },
};
