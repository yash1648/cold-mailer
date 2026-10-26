import multer from "multer";

// Vercel caps serverless request bodies at 4.5 MB, so keep uploads below that.
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
    },
});

/**
 * Accepts the file under any field name (the old API used "file" for uploads
 * and "screenshot" for extraction), then exposes it as req.file.
 */
export const acceptSingleFile = (req, res, next) => {
    upload.any()(req, res, (error) => {
        if (error) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    success: false,
                    message: `File is too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
                });
            }

            if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
                return res.status(400).json({
                    success: false,
                    message: "Only one file can be uploaded per request.",
                });
            }

            console.error("Upload middleware error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Could not read the uploaded file.",
            });
        }

        if (Array.isArray(req.files) && req.files.length > 1) {
            return res.status(400).json({
                success: false,
                message: "Only one file can be uploaded per request.",
            });
        }

        req.file = req.files?.[0];
        return next();
    });
};
