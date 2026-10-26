import cloudinary from "../config/cloud.config.js";
import User from "../model/auth.model.js";
import File from "../model/file.model.js";

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/webp",
]);

const uploadToCloudinary = (buffer, resourceType) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "files",
                resource_type: resourceType,
                timeout: 60000,
            },
            (error, result) => (error ? reject(error) : resolve(result))
        );

        stream.end(buffer);
    });

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded",
                success: false,
            });
        }

        if (!ALLOWED_MIME_TYPES.has(req.file.mimetype)) {
            return res.status(415).json({
                message: "Unsupported file type. Upload a PDF, DOC/DOCX, TXT, or image.",
                success: false,
            });
        }

        const filename = (req.body?.filename || req.file.originalname || "resume").trim();

        // Images must use the "image" resource type. PDFs and documents must use
        // "raw": image-type PDFs are blocked by Cloudinary's default
        // restricted_media_types setting, which makes the URL return 401 and
        // breaks email attachments that fetch the URL.
        const resourceType = req.file.mimetype.startsWith("image/") ? "image" : "raw";
        const result = await uploadToCloudinary(req.file.buffer, resourceType);

        const file = await File.create({
            filename,
            fileUrl: result.secure_url,
            createdBy: req.user._id,
        });

        await User.findByIdAndUpdate(req.user._id, {
            $push: { files: file._id },
        });

        return res.status(201).json({
            message: "File uploaded successfully",
            success: true,
            file,
        });
    } catch (err) {
        console.error("File upload error:", err.message);
        return res.status(502).json({
            message: "Could not store the uploaded file. Please try again.",
            success: false,
        });
    }
};
