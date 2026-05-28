const LOCAL_BACKEND_URL = "http://localhost:5000";

export function getBackendBaseUrl(): string {
  const configuredBaseUrl =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || LOCAL_BACKEND_URL;

  return configuredBaseUrl.replace(/\/+$/, "");
}
