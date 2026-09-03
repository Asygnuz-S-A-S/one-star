import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp,
    });
  } catch (error: unknown) {
    console.error("[GET /api/health]", error);

    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        timestamp,
      },
      { status: 503 }
    );
  }
}
