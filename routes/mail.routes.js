import express from "express";
import {authMiddleware} from "../middleware/auth.middleware.js"
import {generateEmails, getMyEmails,getEmailById,updateEmail,deleteEmail,sendMail} from "../controller/mail.controller.js"
const router=express.Router()

router.post("/generate",authMiddleware,generateEmails)
router.get("/",authMiddleware,getMyEmails)
router.get("/:id",authMiddleware,getEmailById)
router.put("/:id",authMiddleware,updateEmail)
router.delete("/:id",authMiddleware,deleteEmail)
router.post("/send",authMiddleware,sendMail)


export default router