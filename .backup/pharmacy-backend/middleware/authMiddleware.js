const { verifyAuthToken } = require("../utils/authToken");

const normalizeToken = (value) =>
  String(value ?? "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return "";
  }

  const cookieEntries = cookieHeader.split(";").map((entry) => entry.trim());
  for (const entry of cookieEntries) {
    const [name, ...valueParts] = entry.split("=");
    const value = valueParts.join("=");

    if (name === "pharmacy_session_token" || name === "token") {
      return normalizeToken(decodeURIComponent(value));
    }
  }

  return "";
};

const getRequestToken = (req) => {
  const authorizationHeader = String(req.headers.authorization || "");
  const headerToken = normalizeToken(authorizationHeader);
  const cookieToken = parseCookieToken(req.headers.cookie || "");

  return headerToken || cookieToken;
};

const requireAuth = (req, res, next) => {
  const token = getRequestToken(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  req.auth = payload;
  return next();
};

const requireRole = (allowedRoles) => (req, res, next) => {
  const userRole = req.auth?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: "Forbidden: insufficient role." });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireRole,
};