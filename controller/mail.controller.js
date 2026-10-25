import Mail from "../model/mail.model.js";
import Extraction from "../model/extraction.model.js";
import User from "../model/auth.model.js";
import File from "../model/file.model.js";
import { generateColdEmails } from "../services/mail.service.js";
import { sendEmail } from "../services/email.service.js";
export const generateEmails = async (req, res) => {
  try {
    const { extractionId } = req.body;
    const extraction = await Extraction.findOne({
      _id: extractionId,
      createdBy: req.user._id,
    });
    if (!extraction) {
      return res.status(404).json({
        message: "Extraction not found",
      });
    }
    const user = await User.findById(req.user._id);
    const studentProfile = {
      name: user.name,
      email: user.email,
      role: user.domain || user.role || "Job Applicant",
      skills: user.skills,
    };
    const emails = await generateColdEmails(extraction.data, studentProfile);
    const savedEmails = await Mail.insertMany(
      emails.map((email, index) => ({
        mailId: Date.now() + index,
        subject: email.subject,
        body: email.body,
        recipientEmail:
          extraction.data?.recruiter_email ||
          extraction.data?.recruiterEmail ||
          extraction.data?.email ||
          "",
        createdBy: user._id,
      })),
    );
    await User.findByIdAndUpdate(user._id, {
      $push: {
        mails: { $each: savedEmails.map((email) => email._id) },
      },
    });
    res.status(201).json({
      success: true,
      message: "Emails generated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getMyEmails = async (req, res) => {
  try {
    const emails = await Mail.find({
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      emails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getEmailById = async (req, res) => {
  try {
    const email = await Mail.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }
    res.status(200).json({
      success: true,
      email,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateEmail = async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject && !body) {
      return res.status(400).json({
        success: false,
        message: "Subject or body is required",
      });
    }
    const updates = {};
    if (subject) updates.subject = subject;
    if (body) updates.body = body;
    const email = await Mail.findOneAndUpdate(
      {
        _id: req.params.id,
        createdBy: req.user._id,
      },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Email updated successfully",
      email,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteEmail = async (req, res) => {
  try {
    const email = await Mail.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });
    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Email deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// SMTP
export const sendMail = async (req, res) => {
  try {
    const { emailId, to } = req.body;
    if (!emailId) {
      return res.status(400).json({
        success: false,
        message: "Email ID is required",
      });
    }
    const email = await Mail.findOne({
      _id: emailId,
      createdBy: req.user._id,
    });
    if (!email) {
      return res.status(404).json({
        success: false,
        message: "Email draft not found",
      });
    }
    const recipient = to || email.recipientEmail;
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient email is required",
      });
    }
    const resume = await File.findOne({
      createdBy: req.user._id,
    }).sort({ createdAt: -1 });
    await sendEmail(recipient, email.subject, email.body, resume?.fileUrl || resume?.fileURL);
    await Mail.deleteMany({
      createdBy: req.user._id,
      _id: { $ne: emailId },
    });
    return res.status(200).json({
      success: true,
      message: "Email sent successfully. Remaining drafts deleted.",
      sentTo: recipient,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
