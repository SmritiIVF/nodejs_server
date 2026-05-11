const User = require("../models/user.model");
const { verifyToken } = require("../utils/authToken");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Authorization token is required" });
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id).select("_id name email role");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", details: error.message });
  }
}

module.exports = { requireAuth };
