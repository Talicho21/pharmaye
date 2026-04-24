import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const thresholdMonths = searchParams.get("thresholdMonths") || "3";
    const authorization = request.headers.get("authorization");

    const backendUrl = new URL(`${BACKEND_BASE_URL}/api/reports/inactive`);
    backendUrl.searchParams.set("thresholdMonths", thresholdMonths);

    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      headers: authorization ? { authorization } : undefined,
    });
    const payload = await response.json();

    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { message: "Unable to fetch inactive sales history" },
      { status: 500 },
    );
  }
}
