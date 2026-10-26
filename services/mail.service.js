import { callModel } from "../utils/ai.utils.js";
import { parseJsonFromModel } from "../utils/json.utils.js";

const orFallback = (value, fallback) => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text ? text : fallback;
};

const listText = (value) => (Array.isArray(value) ? value.filter(Boolean).join(", ") : "");

const buildPrompt = (companyDetails, candidate) => `
You are an expert cold email writer helping a job seeker write personalized emails to recruiters.

RECRUITMENT OPPORTUNITY (extracted from a recruitment post, verbatim; null means unknown):
- Recruiter email: ${companyDetails.recruiter_email ?? "unknown"}
- Recruiter name: ${companyDetails.recruiter_name ?? "unknown"}
- Company: ${companyDetails.company ?? "unknown"}
- Target job role: ${companyDetails.job_role ?? "unknown"}
- Skills requested by the recruiter: ${listText(companyDetails.required_skills) || "unknown"}
- Original post text: ${companyDetails.post_content ?? "unknown"}

CANDIDATE PROFILE (from the database):
- Name: ${candidate.name}
- Current role/domain: ${candidate.role}
- Email: ${candidate.email}
- Skills: ${candidate.skills || "not provided"}

TASK:
Write exactly 3 cold emails from the candidate applying for the target role.
EMAIL 1: Professional - formal, suitable for contacting a recruiter directly.
EMAIL 2: Concise - short and direct, focused on role match and relevant skills.
EMAIL 3: Networking-friendly - friendly and conversational, focused on starting a professional connection.

RULES:
1. Address the recruiter by name only when a name was provided; otherwise use a neutral greeting.
2. Use the real company and job role when provided. If a value is unknown, keep the wording general instead of inventing it.
3. Match the candidate's actual role and skills to the role. Never invent skills, experience, projects, degrees, or achievements.
4. Never invent recruiter names, companies, or email addresses. Do not claim to have followed, used, or admired the company's products, and do not mention company projects or culture: none of that was provided.
5. Each email must have a different subject and a different body.
6. Keep each body under 170 words, written as plain text with paragraph breaks.
7. Return only valid JSON with no Markdown fences.

Use this exact JSON structure:
{
  "emails": [
    { "type": "Professional", "subject": "Email subject", "body": "Email body" },
    { "type": "Concise", "subject": "Email subject", "body": "Email body" },
    { "type": "Networking-friendly", "subject": "Email subject", "body": "Email body" }
  ]
}
`.trim();

export const generateColdEmails = async (companyDetails = {}, studentProfile = {}) => {
    const candidate = {
        name: orFallback(studentProfile.name, "the candidate"),
        email: orFallback(studentProfile.email, ""),
        role: orFallback(studentProfile.role, "Job Applicant"),
        skills: listText(studentProfile.skills),
    };

    const aiResponse = await callModel(buildPrompt(companyDetails, candidate));

    let result;
    try {
        result = parseJsonFromModel(aiResponse);
    } catch (error) {
        console.error("AI response could not be parsed:", aiResponse.slice(0, 500));
        throw new Error("AI returned an invalid email format");
    }

    if (!Array.isArray(result.emails) || result.emails.length !== 3) {
        throw new Error("AI did not generate exactly three emails");
    }

    for (const email of result.emails) {
        if (
            typeof email.subject !== "string" ||
            !email.subject.trim() ||
            typeof email.body !== "string" ||
            !email.body.trim()
        ) {
            throw new Error("An email is missing its subject or body");
        }
    }

    return result.emails.map((email, index) => ({
        type: orFallback(email.type, `email-${index + 1}`),
        subject: email.subject.trim(),
        body: email.body.trim(),
    }));
};
