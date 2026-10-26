import nodemailer from "nodemailer";

let transporter = null;

const buildTransporter = () => {
    const port = Number(process.env.SMTP_PORT || 587);

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
    });
};

const getTransporter = () => {
    if (!transporter) {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            throw new Error("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)");
        }
        transporter = buildTransporter();
    }
    return transporter;
};

export const sendEmail = async (to, subject, body, resume = null) => {
    const attachments = resume?.url
        ? [
              {
                  filename: resume.filename || "Resume.pdf",
                  path: resume.url,
                  contentDisposition: "attachment",
              },
          ]
        : [];

    return getTransporter().sendMail({
        from: process.env.SMTP_USER,
        to,
        subject,
        text: body,
        attachments,
    });
};
