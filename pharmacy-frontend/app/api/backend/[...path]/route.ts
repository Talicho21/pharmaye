import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/app/api/_lib/backendBaseUrl";

export const dynamic = "force-dynamic";

async function proxy(request: NextRequest, path: string[]) {
  try {
    const backendBaseUrl = getBackendBaseUrl();

    const targetUrl = new URL(
      `${backendBaseUrl}/api/${path.join("/")}`
    );

    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const headers = new Headers(request.headers);

    // Remove headers that can cause proxy issues
    headers.delete("host");
    headers.delete("content-length");

    const method = request.method.toUpperCase();
    const shouldSendBody = method !== "GET" && method !== "HEAD";

    const body = shouldSendBody
      ? await request.arrayBuffer()
      : undefined;

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method,
      headers,
      body:
        shouldSendBody && body && body.byteLength > 0
          ? body
          : undefined,
      cache: "no-store",
    });

    // Read the response body first
    const responseBody = await upstreamResponse.arrayBuffer();

    // Clone headers so we can safely modify them
    const responseHeaders = new Headers(upstreamResponse.headers);

    // Remove headers that commonly cause
    // ERR_CONTENT_DECODING_FAILED on Vercel
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend proxy error:", error);

    return NextResponse.json(
      {
        message: "Unable to reach backend service",
      },
      {
        status: 502,
      }
    );
  }
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { path } = await context.params;
  return proxy(request, path);
}