import { NextResponse } from "next/server";

const SESSION_COOKIE_KEY = "pharmacy_session_token";

const BACKEND_BASE_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await response.json();
    const nextResponse = NextResponse.json(payload, { status: response.status });

    if (response.ok && payload?.token) {
      nextResponse.cookies.set(SESSION_COOKIE_KEY, payload.token, {
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return nextResponse;
  } catch (_error) {
    return NextResponse.json(
      {
        message:
          "Unable to reach the backend login service. Check that the backend is running and the database env vars are set.",
      },
      { status: 503 },
    );
  }
}