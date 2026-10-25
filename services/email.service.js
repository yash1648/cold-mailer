import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
export const sendEmail = async (to, subject, body, resumeUrl = null) => {
  return await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text: body,
    attachments: resumeUrl ? [{ filename: "Resume.pdf", path: resumeUrl }] : [],
  });
};
