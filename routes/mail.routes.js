import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { rateLimit } from "../middleware/rate-limit.middleware.js";
import {
    generateEmails,
    getMyEmails,
    getEmailById,
    updateEmail,
    deleteEmail,
    sendMail,
} from "../controller/mail.controller.js";

const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "ai" });
const sendLimiter = rateLimit({ windowMs: 60_000, max: 10, keyPrefix: "send" });

router.post("/generate", authMiddleware, aiLimiter, generateEmails);
router.get("/", authMiddleware, getMyEmails);
router.get("/:id", authMiddleware, getEmailById);
router.put("/:id", authMiddleware, updateEmail);
router.delete("/:id", authMiddleware, deleteEmail);
router.post("/send", authMiddleware, sendLimiter, sendMail);

export default router;
