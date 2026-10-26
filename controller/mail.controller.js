import mongoose from "mongoose";
import Mail from "../model/mail.model.js";
import Extraction from "../model/extraction.model.js";
import User from "../model/auth.model.js";
import File from "../model/file.model.js";
import { generateColdEmails } from "../services/mail.service.js";
import { sendEmail } from "../services/email.service.js";
import { normaliseExtraction } from "../utils/extraction.utils.js";

const badId = (res, label) =>
    res.status(400).json({
        success: false,
        message: `${label} id is invalid`,
    });

const isAiFailure = (error) => /AI service is temporarily unavailable/.test(error.message);

export const generateEmails = async (req, res) => {
    try {
        const { extractionId } = req.body;
        if (!extractionId || !mongoose.isValidObjectId(extractionId)) {
            return res.status(400).json({
                success: false,
                message: "A valid extractionId is required",
            });
        }

        const extraction = await Extraction.findOne({
            _id: extractionId,
            createdBy: req.user._id,
        });

        if (!extraction) {
            return res.status(404).json({
                success: false,
                message: "Extraction not found",
            });
        }

        const user = req.user;
        const details = normaliseExtraction(extraction.data);
        const studentProfile = {
            name: user.name,
            email: user.email,
            role: user.domain || "Job Applicant",
            skills: user.skills,
        };

        const emails = await generateColdEmails(details, studentProfile);
        const recipientEmail = details.recruiter_email || "";

        const savedEmails = await Mail.insertMany(
            emails.map((email, index) => ({
                mailId: Date.now() + index,
                subject: email.subject,
                body: email.body,
                recipientEmail,
                createdBy: user._id,
            }))
        );

        await User.findByIdAndUpdate(user._id, {
            $push: { mails: { $each: savedEmails.map((mail) => mail._id) } },
        });

        return res.status(201).json({
            success: true,
            message: "Emails generated successfully",
            recipientEmail,
            emails: savedEmails,
        });
    } catch (error) {
        console.error("generateEmails failed:", error.message);
        return res.status(isAiFailure(error) ? 503 : 500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getMyEmails = async (req, res) => {
    try {
        const emails = await Mail.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({ success: true, emails });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getEmailById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return badId(res, "Email");
        }

        const email = await Mail.findOne({
            _id: req.params.id,
            createdBy: req.user._id,
        });

        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        return res.status(200).json({ success: true, email });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateEmail = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return badId(res, "Email");
        }

        const { subject, body, recipientEmail } = req.body;
        const updates = {};
        if (typeof subject === "string" && subject.trim()) updates.subject = subject.trim();
        if (typeof body === "string" && body.trim()) updates.body = body;
        if (typeof recipientEmail === "string") updates.recipientEmail = recipientEmail.trim();

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Subject, body, or recipientEmail is required",
            });
        }

        const email = await Mail.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Email updated successfully",
            email,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteEmail = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return badId(res, "Email");
        }

        const email = await Mail.findOneAndDelete({
            _id: req.params.id,
            createdBy: req.user._id,
        });

        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Email deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const sendMail = async (req, res) => {
    try {
        const { emailId, to } = req.body;
        if (!emailId || !mongoose.isValidObjectId(emailId)) {
            return res.status(400).json({
                success: false,
                message: "A valid emailId is required",
            });
        }

        const email = await Mail.findOne({
            _id: emailId,
            createdBy: req.user._id,
        });

        if (!email) {
            return res.status(404).json({ success: false, message: "Email draft not found" });
        }

        const recipient = (to || email.recipientEmail || "").trim();
        if (!recipient) {
            return res.status(400).json({
                success: false,
                message: "Recipient email is required. Add it to the draft or pass 'to'.",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
            return res.status(400).json({
                success: false,
                message: "Recipient email is not a valid email address",
            });
        }

        const resume = await File.findOne({ createdBy: req.user._id }).sort({ createdAt: -1 });

        await sendEmail(recipient, email.subject, email.body, resume
            ? { url: resume.fileUrl, filename: resume.filename || "Resume.pdf" }
            : null);

        // Keep the sent draft as history and clear the other variants written
        // for the same recipient. Drafts for other recruiters are untouched.
        if (email.recipientEmail) {
            await Mail.deleteMany({
                createdBy: req.user._id,
                recipientEmail: email.recipientEmail,
                _id: { $ne: emailId },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Email sent successfully.",
            sentTo: recipient,
        });
    } catch (error) {
        console.error("sendMail failed:", error.message);
        return res.status(502).json({
            success: false,
            message: `Could not send email: ${error.message}`,
        });
    }
};
