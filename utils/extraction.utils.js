/**
 * Normalizes AI extraction output into one stable shape.
 *
 * The model is asked for snake_case keys but free-tier models frequently return
 * "Recruiter email", "recruiterEmail", "Recruiter or author name", etc.
 * Everything downstream (mail generation, recipient lookup) reads this shape.
 */

const normaliseKey = (key) =>
    String(key)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

const toText = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed && trimmed.toLowerCase() !== "null" ? trimmed : null;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return null;
};

const toList = (value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) {
        return value.map(toText).filter(Boolean);
    }
    const text = toText(value);
    if (!text) return [];
    return text
        .split(/\r?\n|,|;|\||•/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const pick = (source, aliases) => {
    if (!source || typeof source !== "object") return null;
    const lookup = new Map();
    for (const [key, value] of Object.entries(source)) {
        lookup.set(normaliseKey(key), value);
    }
    for (const alias of aliases) {
        const key = normaliseKey(alias);
        if (lookup.has(key)) return lookup.get(key);
    }
    return null;
};

const pickText = (source, aliases) => toText(pick(source, aliases));
const pickList = (source, aliases) => toList(pick(source, aliases));

const firstNonEmpty = (...lists) => lists.find((list) => list.length > 0) || [];

export const normaliseExtraction = (raw) => {
    const source =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : { rawContent: raw };

    const type = pickText(source, ["type", "document_type", "content_type"]) || null;
    const candidateSource = pick(source, ["candidate", "resume", "profile"]) || {};

    // On a resume, a bare "email"/"skills" field is the candidate's, not the
    // recruiter's. Only fall back to those generic names for job posts.
    const isResume = type === "resume";

    const recruiterEmailAliases = [
        "recruiter_email",
        "recruiterEmail",
        "recruiter email",
        "hr_email",
        "hrEmail",
        "hr email",
        "contact_email",
        "contact email",
        ...(isResume ? [] : ["email"]),
    ];

    return {
        type,
        recruiter_email: pickText(source, recruiterEmailAliases),
        recruiter_name: pickText(source, [
            "recruiter_name",
            "recruiterName",
            "recruiter or author name",
            "recruiter_author_name",
            "recruiter",
            "author_name",
            "author name",
        ]),
        company: pickText(source, ["company", "company_name", "organization", "employer"]),
        job_role: pickText(source, [
            "job_role",
            "jobRole",
            "job role",
            "role",
            "position",
            "title",
        ]),
        required_skills: pickList(source, [
            "required_skills",
            "requiredSkills",
            "required skills",
            "skills_required",
            ...(isResume ? [] : ["skills"]),
        ]),
        post_content: pickText(source, [
            "post_content",
            "postContent",
            "post content",
            "post",
            "description",
            "content",
        ]),
        candidate_name:
            pickText(candidateSource, ["name", "full_name", "fullName"]) ||
            pickText(source, ["candidate_name", "name", "full_name"]),
        candidate_email:
            pickText(candidateSource, ["email"]) ||
            pickText(source, ["candidate_email"]),
        candidate_phone:
            pickText(candidateSource, ["phone", "phone_number", "mobile"]) ||
            pickText(source, ["candidate_phone", "phone"]),
        candidate_skills: firstNonEmpty(
            pickList(candidateSource, ["skills"]),
            pickList(source, ["candidate_skills", "candidate skills"])
        ),
        education: firstNonEmpty(
            pickList(candidateSource, ["education"]),
            pickList(source, ["education"])
        ),
        experience: firstNonEmpty(
            pickList(candidateSource, ["experience"]),
            pickList(source, ["experience"])
        ),
        projects: firstNonEmpty(
            pickList(candidateSource, ["projects"]),
            pickList(source, ["projects"])
        ),
    };
};

/**
 * Text prompt used for both the extraction request and for grounding the
 * email writer, so both sides agree on field names.
 */
export const extractionSchemaDescription = `{
  "type": "resume" | "recruitment_post" | "other",
  "recruiter_email": string | null,
  "recruiter_name": string | null,
  "company": string | null,
  "job_role": string | null,
  "required_skills": string[],
  "post_content": string | null,
  "candidate": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "skills": string[],
    "education": string[],
    "experience": string[],
    "projects": string[]
  }
}`;
