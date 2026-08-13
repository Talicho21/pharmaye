import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const authorization = request.headers.get("authorization");

    const backendUrl = new URL(`${BACKEND_BASE_URL}/api/reports/sales-log`);
    if (startDate) backendUrl.searchParams.set("startDate", startDate);
    if (endDate) backendUrl.searchParams.set("endDate", endDate);

    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      headers: authorization ? { authorization } : undefined,
    });
    const payload = await response.json();

    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { message: "Unable to fetch detailed sales log" },
      { status: 500 },
    );
  }
}
