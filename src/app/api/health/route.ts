import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users,
      authUrl: process.env.AUTH_URL ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
      hasDb: Boolean(process.env.DATABASE_URL),
      hasSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "DB error",
        hasDb: Boolean(process.env.DATABASE_URL),
        hasSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        authUrl: process.env.AUTH_URL ?? null,
      },
      { status: 500 }
    );
  }
}
