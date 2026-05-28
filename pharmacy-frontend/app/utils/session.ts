export const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
export const SESSION_COOKIE_KEY = "pharmacy_session_token";

export function readSessionCookie(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const cookieEntry = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SESSION_COOKIE_KEY}=`));

  if (!cookieEntry) {
    return "";
  }

  return decodeURIComponent(cookieEntry.split("=")[1] ?? "");
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
