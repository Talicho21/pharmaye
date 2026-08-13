import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";
    const authorization = request.headers.get("authorization");

    const response = await fetch(
      `${BACKEND_BASE_URL}/api/reports?range=${encodeURIComponent(range)}`,
      {
        cache: "no-store",
        headers: authorization ? { authorization } : undefined,
      },
    );

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { message: "Unable to fetch report data" },
      { status: 500 },
    );
  }
}
