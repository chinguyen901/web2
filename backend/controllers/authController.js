const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const ApiError = require("../utils/apiError");
const validate = require("../middleware/validate");

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function signToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new ApiError("Server misconfiguration: JWT_SECRET missing.", 500);
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

async function register(req, res) {
  const body = validate(registerSchema, req.body);

  const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
  if (existingUser) throw new ApiError("Email already registered.", 409);

  const hashedPassword = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashedPassword
    }
  });

  const token = signToken(user.id);
  return res.status(201).json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
}

async function login(req, res) {
  const body = validate(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw new ApiError("Invalid email or password.", 401);

  const isMatch = await bcrypt.compare(body.password, user.password);
  if (!isMatch) throw new ApiError("Invalid email or password.", 401);

  const token = signToken(user.id);
  return res.status(200).json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
}

module.exports = { register, login };
