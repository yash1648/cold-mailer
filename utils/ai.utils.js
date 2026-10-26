import axios from "axios";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier models get rate limited or cold-started often, so try a few.
// Order matters: the first model is the fast path (a slow first model can
// exhaust the 60s Vercel function limit before any fallback is tried).
const DEFAULT_TEXT_MODELS = [
    "poolside/laguna-xs-2.1:free",
    "xingchen-agi/xing4.0-29b-a4b:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
];

const DEFAULT_VISION_MODELS = [
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "dots-studio/dots-3-note-preview:free",
    "nvidia/nemotron-3.5-super-vl:free",
];

const REQUEST_TIMEOUT_MS = 40000;
const TOTAL_BUDGET_MS = 52000;

const unique = (values) => [...new Set(values.filter(Boolean))];

const modelList = (imageData) => {
    const envOverride = imageData
        ? process.env.AI_VISION_MODEL
        : process.env.AI_MODEL;
    const defaults = imageData ? DEFAULT_VISION_MODELS : DEFAULT_TEXT_MODELS;
    return unique([envOverride, ...defaults]);
};

const isRetryable = (error) => {
    const status = error.response?.status;
    return (
        !status ||
        status === 408 ||
        status === 409 ||
        status === 425 ||
        status === 429 ||
        status >= 500
    );
};

export const callModel = async (prompt, imageData = null) => {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is missing. Check your environment variables.");
    }

    const content = [{ type: "text", text: prompt }];
    if (imageData) {
        content.push({ type: "image_url", image_url: { url: imageData } });
    }

    const startedAt = Date.now();
    const errors = [];
    const models = modelList(imageData);

    for (const model of models) {
        const elapsed = Date.now() - startedAt;
        const remaining = TOTAL_BUDGET_MS - elapsed;
        if (remaining < 5000) break;

        for (let attempt = 0; attempt < 2; attempt++) {
            const timeout = Math.min(REQUEST_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt));
            if (timeout < 5000) break;

            try {
                const response = await axios.post(
                    OPENROUTER_API_URL,
                    {
                        model,
                        messages: [{ role: "user", content }],
                        temperature: 0.2,
                        max_tokens: 1600,
                        stream: false,
                        provider: { sort: "throughput" },
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": process.env.APP_URL || "https://grims-cold-mailer.vercel.app",
                            "X-Title": "Cold Mailer",
                        },
                        timeout,
                    }
                );

                const choice = response.data?.choices?.[0];
                const text = choice?.message?.content;

                if (typeof text === "string" && text.trim()) {
                    return text;
                }

                errors.push(`${model}: empty completion`);
            } catch (error) {
                const status = error.response?.status;
                const providerMessage =
                    error.response?.data?.error?.message || error.message;
                errors.push(`${model}: ${status ? status + " " : ""}${providerMessage}`);

                console.error(
                    `OpenRouter error [${model}] status=${status ?? "network"}: ${providerMessage}`
                );

                if (!isRetryable(error)) break;
                // Small backoff before retrying the same provider/model.
                await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
            }
        }
    }

    const detail = errors.slice(-3).join(" | ") || "all models exhausted";
    throw new Error(`AI service is temporarily unavailable (${detail})`);
};

// Backwards-compatible alias used by older imports.
export const extractWithNvidia = callModel;
