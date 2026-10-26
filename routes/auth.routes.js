import express from "express";
import { registerUser, loginUser, getCurrentUser } from "../controller/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rate-limit.middleware.js";

const router = express.Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: "auth" });

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/me", authMiddleware, getCurrentUser);

export default router;
