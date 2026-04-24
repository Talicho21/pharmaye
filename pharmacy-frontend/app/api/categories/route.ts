import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/categories`, {
      cache: "no-store",
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { message: "Unable to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (_error) {
    return NextResponse.json(
      { message: "Unable to create category" },
      { status: 500 },
    );
  }
}
