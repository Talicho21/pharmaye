const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const AUTH_TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  "pharmacy-rbac-dev-secret-change-this";

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

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

const signLegacyToken = (payloadPart) =>
  encodeBase64Url(
    crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payloadPart).digest(),
  );

const createAuthToken = (payload) =>
  jwt.sign(payload, AUTH_TOKEN_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

const verifyAuthToken = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    return jwt.verify(token, AUTH_TOKEN_SECRET);
  } catch (_jwtError) {
    const [payloadPart, signaturePart] = token.split(".");

    if (!payloadPart || !signaturePart) {
      return null;
    }

    const expectedSignature = signLegacyToken(payloadPart);
    if (expectedSignature !== signaturePart) {
      return null;
    }

    try {
      const payload = JSON.parse(decodeBase64Url(payloadPart));
      if (!payload?.exp || Date.now() > Number(payload.exp)) {
        return null;
      }

      return payload;
    } catch (_legacyError) {
      return null;
    }
  }
};

module.exports = {
  createAuthToken,
  verifyAuthToken,
};