const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError");
const prisma = require("../lib/prisma");

async function protect(req) {
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
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, name: true, email: true, createdAt: true, updatedAt: true }
  });

  if (!user) {
    throw new ApiError("User not found.", 401);
  }

  req.user = user;
}

module.exports = { protect };
