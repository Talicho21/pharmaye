const crypto = require("crypto");

const AUTH_TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET || "pharmacy-rbac-dev-secret-change-this";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const encodeBase64Url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const decodeBase64Url = (input) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

const sign = (payloadPart) =>
  encodeBase64Url(
    crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payloadPart).digest(),
  );

const createAuthToken = (payload) => {
  const issuedAt = Date.now();
  const tokenPayload = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_MS,
  };

  const payloadPart = encodeBase64Url(JSON.stringify(tokenPayload));
  const signaturePart = sign(payloadPart);

  return `${payloadPart}.${signaturePart}`;
};

const verifyAuthToken = (token) => {
  if (!token || typeof token !== "string") return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  const expectedSignature = sign(payloadPart);
  if (expectedSignature !== signaturePart) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart));
    if (!payload?.exp || Date.now() > Number(payload.exp)) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
};

module.exports = {
  createAuthToken,
  verifyAuthToken,
};