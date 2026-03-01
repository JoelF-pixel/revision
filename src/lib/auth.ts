import type { NextAuthOptions, Profile } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || process.env.GOOGLE_WORKSPACE_DOMAIN;
const authProvider = (process.env.AUTH_PROVIDER || "google").toLowerCase();

function getProviders() {
  if (authProvider === "mock") {
    return [
      CredentialsProvider({
        id: "mock",
        name: "Mock",
        credentials: {
          email: { label: "Email", type: "email", placeholder: "student@school.edu" },
          name: { label: "Name", type: "text", placeholder: "Test Student" },
        },
        async authorize(credentials) {
          const email = credentials?.email?.toString().trim().toLowerCase();
          if (!email) return null;

          if (allowedDomain) {
            const domain = email.split("@")[1]?.toLowerCase();
            if (domain !== allowedDomain.toLowerCase()) return null;
          }

          return {
            id: email,
            email,
            name: credentials?.name?.toString().trim() || "Local Test User",
          };
        },
      }),
    ];
  }

  if (authProvider === "microsoft" || authProvider === "azure-ad" || authProvider === "azure") {
    return [
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID ?? "",
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? "",
        tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
      }),
    ];
  }

  return [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ];
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: getProviders(),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, profile }) {
      const profileEmail = (profile as Profile & { email?: string } | null)?.email;
      const email = (user.email ?? profileEmail)?.toLowerCase();
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
          where: { email: String(token.email).toLowerCase() },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      session.userId = token.userId;
      return session;
    },
  },
};
