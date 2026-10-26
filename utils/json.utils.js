/**
 * Tolerant JSON extraction for LLM responses.
 * Handles markdown fences, leading prose, and trailing commentary.
 */
export const parseJsonFromModel = (text) => {
    if (typeof text !== "string" || !text.trim()) {
        throw new Error("Model returned an empty response");
    }

    const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        // Fall back to the outermost JSON object in the response.
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Model response did not contain a JSON object");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
};
