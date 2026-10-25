import express from "express";
import {upload} from "../middleware/multer.middleware.js"
const router = new express.Router()
import {uploadFile} from "../controller/file.controller.js"
import {authMiddleware} from "../middleware/auth.middleware.js"
import {extractContent} from "../controller/extraction.controller.js"

router.post("/upload",authMiddleware,upload.single("file"),uploadFile)
router.post("/extract",authMiddleware,upload.single("screenshot"),extractContent)
export default router