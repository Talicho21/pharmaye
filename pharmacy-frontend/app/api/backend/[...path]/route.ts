import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/app/api/_lib/backendBaseUrl";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, path: string[]) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    const targetUrl = new URL(`${backendBaseUrl}/api/${path.join("/")}`);

    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const headers = new Headers(request.headers);
    headers.delete("host");

    const method = request.method.toUpperCase();
    const shouldSendBody = method !== "GET" && method !== "HEAD";
    const body = shouldSendBody ? await request.arrayBuffer() : undefined;

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: shouldSendBody && body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach backend service" },
      { status: 502 },
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
