import { checkDatabaseHealth } from "@classroom-os/database";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const dependency = await checkDatabaseHealth();
    return NextResponse.json(
      { status: "ready", ...dependency },
      { headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
    );
  } catch {
    console.error(JSON.stringify({ level: "error", event: "health.database_unavailable", requestId }));
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "x-request-id": requestId } },
    );
  }
}
