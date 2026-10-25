import { extractWithNvidia } from "../utils/ai.utils.js";
export const generateColdEmails = async (
  companyDetails,
  studentProfile = {},
) => {
  // Extract recruitment opportunity details (from recruitment image/post)
  const hrEmail = companyDetails.recruiter_email || "Not specified";
  const jobRole = companyDetails.job_role || "Open Role";
  const company = companyDetails.company || "the company";
  const recruiterName = companyDetails.recruiter_author_name || "Hiring Team";
  // Extract candidate profile details (from DB/registration)
  const candidateRole = studentProfile.role || "Job Applicant";
  const candidateSkills = Array.isArray(studentProfile.skills)
    ? studentProfile.skills.join(", ")
    : studentProfile.skills || "Relevant skills";
  const candidateName = studentProfile.name || "Candidate";
  const prompt = `
You are an expert cold email writer helping job seekers write highly effective, personalized
cold emails to recruiters.
RECRUITMENT OPPORTUNITY (EXTRACTED FROM RECRUITMENT POST /
IMAGE):
- HR / Recruiter Email: ${hrEmail}
- Target Job Role: ${jobRole}
- Company: ${company}
- Recruiter Name: ${recruiterName}
- Details:
${JSON.stringify(companyDetails, null, 2)} CANDIDATE PROFILE (FROM DATABASE):
- Candidate Name: ${candidateName}
- Candidate Role: ${candidateRole}
- Candidate Skills: ${candidateSkills}
- Profile Details:
${JSON.stringify(studentProfile, null, 2)}
TASK:
Write personalized cold emails from the candidate (${candidateName}, role:
"${candidateRole}") applying for the target role ("${jobRole}") at ${company}, addressing
the recruiter / HR (email: ${hrEmail}).
Pitch the candidate by strongly highlighting how their current Role ("${candidateRole}") and
Skills (${candidateSkills}) directly align with the requirements of the Job Role
("${jobRole}").
Generate exactly 3 personalized cold emails.
EMAIL 1: Professional
- Formal and professional.
- Suitable for contacting a recruiter directly.
EMAIL 2: Concise
- Short and direct.
- Focus on the relevant opportunity, role match, and skills.
EMAIL 3: Networking-friendly
- Friendly and conversational.
- Focus on starting a professional connection while expressing genuine interest in the role.
RULES:
1. Use the company information and target Job Role ("${jobRole}").
2. Match the candidate's actual Role and Skills with the company and role requirements.
3. Never invent skills, experience, projects, or qualifications not provided.
4. Never invent fake recruiter names or email addresses.
5. If information is missing, do not guess.
6. Give each email a different subject and body.
7. Return only valid JSON without Markdown.
Use this exact JSON structure:
{
 "emails": [
 { "type": "Professional",
 "subject": "Email subject",
 "body": "Email body"
 },
 {
 "type": "Concise",
 "subject": "Email subject",
 "body": "Email body"
 },
 {
 "type": "Networking-friendly",
 "subject": "Email subject",
 "body": "Email body"
 }
 ]
}
`;
  const aiResponse = await extractWithNvidia(prompt);

  let result;
  try {
    const cleanedResponse = aiResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    result = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error("AI response could not be parsed:", aiResponse);
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
  return result.emails;
};