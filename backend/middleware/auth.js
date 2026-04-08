const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError");
const User = require("../models/User");
const connectDB = require("../lib/db");

async function protect(req) {
  await connectDB();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    throw new ApiError("Not authorized. Token missing.", 401);
  }

  if (!process.env.JWT_SECRET) {
    throw new ApiError("Server misconfiguration.", 500);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw new ApiError("User not found.", 401);
  }

  req.user = user;
}

module.exports = { protect };
