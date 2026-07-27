import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { authConfig } from "@/lib/auth.config";

/**
 * Prefer the explicit AUTH_URL (stable production / custom domain).
 * Never force VERCEL_URL over AUTH_URL — that breaks cookies on aliased domains
 * and surfaces as "Invalid email or password" even when credentials are correct.
 */
function resolveAuthUrl() {
  const explicit = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  if (explicit && !/localhost|127\.0\.0\.1/i.test(explicit)) {
    return explicit;
  }

  if (process.env.VERCEL) {
    const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (prodHost) {
      return `https://${prodHost.replace(/^https?:\/\//, "")}`;
    }
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
    }
  }

  return explicit || "http://localhost:3000";
}

process.env.AUTH_URL = resolveAuthUrl();
process.env.NEXTAUTH_URL = process.env.AUTH_URL;

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = String(credentials?.email ?? "")
            .trim()
            .toLowerCase();
          const password = String(credentials?.password ?? "");
          if (!email || !password) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("[auth] authorize failed:", error);
          return null;
        }
      },
    }),
  ],
});
