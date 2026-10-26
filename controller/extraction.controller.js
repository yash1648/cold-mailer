import { callModel } from "../utils/ai.utils.js";
import { parseJsonFromModel } from "../utils/json.utils.js";
import {
    extractionSchemaDescription,
    normaliseExtraction,
} from "../utils/extraction.utils.js";
import Extraction from "../model/extraction.model.js";

const buildPrompt = () => `
Analyze this image and extract only information that is visibly present.

The image is either a resume/CV or a LinkedIn-style recruitment post.

Return a single valid JSON object with exactly this structure and these keys:
${extractionSchemaDescription}

Rules:
- Use null for missing scalar values and [] for missing lists.
- Never invent, guess, or complete missing information.
- "required_skills" is for skills requested by the recruiter in a job post.
- "candidate.skills" is for skills the candidate lists on a resume.
- Put the full visible post text in "post_content" (null for resumes).
- Do not wrap the JSON in Markdown fences and do not add commentary.
`.trim();

export const extractContent = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No image uploaded",
                success: false,
            });
        }

        if (!req.file.mimetype?.startsWith("image/")) {
            return res.status(415).json({
                message: "Only image files can be used for extraction",
                success: false,
            });
        }

        const base64 = req.file.buffer.toString("base64");
        const imageData = `data:${req.file.mimetype};base64,${base64}`;

        const rawResponse = await callModel(buildPrompt(), imageData);

        let parsed;
        try {
            parsed = parseJsonFromModel(rawResponse);
        } catch (error) {
            console.error("Extraction JSON parse failed:", error.message);
            parsed = { rawContent: rawResponse };
        }

        const normalised = normaliseExtraction(parsed);

        const saved = await Extraction.create({
            data: normalised,
            rawContent: rawResponse,
            createdBy: req.user._id,
        });

        return res.status(200).json({
            message: "Content extracted successfully",
            success: true,
            data: saved,
        });
    } catch (error) {
        console.error("Error in extractContent:", error.message);
        const isAiFailure = /AI service is temporarily unavailable/.test(error.message);
        return res.status(isAiFailure ? 503 : 500).json({
            message: isAiFailure
                ? error.message
                : "Could not extract content from the image",
            success: false,
        });
    }
};
