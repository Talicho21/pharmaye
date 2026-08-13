import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function DELETE(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    const response = await fetch(`${BACKEND_BASE_URL}/api/reports/reset`, {
      method: "DELETE",
      cache: "no-store",
      headers: authorization ? { authorization } : undefined,
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Unable to reset sales history" },
      { status: 500 },
    );
  }
}