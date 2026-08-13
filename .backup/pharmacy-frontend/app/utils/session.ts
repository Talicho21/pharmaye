export const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
export const SESSION_COOKIE_KEY = "pharmacy_session_token";

const normalizeSessionValue = (value: string): string =>
  String(value ?? "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();

export function readSessionCookie(cookieName = SESSION_COOKIE_KEY): string {
  if (typeof document === "undefined") {
    return "";
  }

  const candidateCookieNames = Array.from(
    new Set([cookieName, SESSION_COOKIE_KEY].filter(Boolean)),
  );

  const cookieEntry = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) =>
      candidateCookieNames.some((name) => entry.startsWith(`${name}=`)),
    );

  if (!cookieEntry) {
    return "";
  }

  const rawValue = decodeURIComponent(cookieEntry.split("=")[1] ?? "");
  return normalizeSessionValue(rawValue);
}

export function setSessionCookie(token: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${SESSION_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearSessionCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${SESSION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}
