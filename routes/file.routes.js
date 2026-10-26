import express from "express";
import { acceptSingleFile } from "../middleware/multer.middleware.js";
import { uploadFile } from "../controller/file.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { extractContent } from "../controller/extraction.controller.js";

const router = express.Router();

router.post("/upload", authMiddleware, acceptSingleFile, uploadFile);
router.post("/extract", authMiddleware, acceptSingleFile, extractContent);

export default router;
