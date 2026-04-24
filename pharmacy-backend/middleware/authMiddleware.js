const { verifyAuthToken } = require("../utils/authToken");

const requireAuth = (req, res, next) => {
  const authorizationHeader = String(req.headers.authorization || "");

  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
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