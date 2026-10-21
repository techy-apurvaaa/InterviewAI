require("dotenv").config();
const { z } = require("zod");
const { GoogleGenAI } = require("@google/genai");
const { TECHNICAL_BANK, BEHAVIORAL_BANK } = require("./question.bank");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const questionSchema = z.object({
  question: z.string().describe("The question that can be asked in the interview"),
  intention: z.string().describe("The intention of the interviewer behind asking the question"),
  answer: z.string().describe("How to answer this question: points to cover, approach to take, etc."),
  difficulty: z.enum(["easy", "medium", "hard"]).describe("Difficulty of the question for this candidate and role"),
  category: z.string().describe("Short topic label, 1-3 words (e.g. 'System Design', 'React', 'Leadership')"),
});

const moreQuestionsSchema = z.object({
  questions: z.array(questionSchema).describe("Fresh, non-repeating interview questions"),
});

const interviewReportSchema = z.object({
  title: z.string().describe("The job title / position this interview report is for"),
  matchScore: z
    .number()
    .describe("A score between 0 and 100 indicating how well the candidate's profile matches the job"),
  technicalQuestions: z
    .array(questionSchema)
    .describe("Technical questions that can be asked in the interview, with intention and how to answer"),
  behavioralQuestions: z
    .array(questionSchema)
    .describe("Behavioral questions that can be asked in the interview, with intention and how to answer"),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of the skill gap"),
      })
    )
    .describe("Skill gaps in the candidate's profile with their severity"),
  preparationPlan: z
    .array(
      z.object({
        day: z.number().describe("Day number in the preparation plan, starting from 1"),
        focus: z.string().describe("Main focus of this day"),
        tasks: z.array(z.string()).describe("Tasks to do on this day"),
      })
    )
    .describe("A day-wise preparation plan for the candidate"),
});

const tailoredResumeSchema = z.object({
  name: z.string().describe("Candidate name"),
  title: z.string().describe("Target professional title aligned with the job description"),
  phone: z.string().optional().describe("Phone number ONLY if present in the candidate's resume, otherwise empty"),
  location: z.string().optional().describe("City / country ONLY if present in the candidate's resume, otherwise empty"),
  summary: z.string().describe("Impactful 3-4 sentence professional summary tailored for this position"),
  skills: z.array(z.string()).describe("6 to 12 core technical skills and competencies matching the job requirements"),
  experience: z.array(
    z.object({
      role: z.string().describe("Job title or role"),
      company: z.string().describe("Company or organization name"),
      duration: z.string().describe("Time period or duration, e.g. 2022 - Present"),
      highlights: z.array(z.string()).describe("2-4 bullet points describing achievements with action verbs and metrics"),
    })
  ).describe("Past relevant professional experience"),
  projects: z.array(
    z.object({
      name: z.string().describe("Project name"),
      technologies: z.array(z.string()).describe("Technologies and tools used"),
      description: z.string().describe("Short description of the project and outcome"),
    })
  ).describe("Notable projects demonstrating relevant skills"),
  education: z.array(
    z.object({
      degree: z.string().describe("Degree or diploma"),
      institution: z.string().describe("University or school"),
      year: z.string().describe("Year of graduation or study period"),
    })
  ).describe("Educational background"),
  strengths: z.array(z.string()).describe("3-5 key candidate strengths specifically relevant to this job"),
});

const reportJsonSchema = z.toJSONSchema(interviewReportSchema);
const resumeJsonSchema = z.toJSONSchema(tailoredResumeSchema);
const moreQuestionsJsonSchema = z.toJSONSchema(moreQuestionsSchema);

// Priority list of Gemini models for resilience
const CANDIDATE_MODELS = Array.from(
  new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.8-flash"
    ].filter(Boolean)
  )
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(params, retries = 2) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    let delay = 1000;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err) {
        lastError = err;
        const isRetryable = [429, 500, 503].includes(err?.status);
        if (isRetryable && attempt < retries) {
          await sleep(delay);
          delay *= 1.5;
        } else {
          // Break to next candidate model
          break;
        }
      }
    }
  }

  throw lastError || new Error("All AI models failed to respond");
}

function extractJobTitle(jobDescription) {
  const firstLine = jobDescription.split("\n")[0].trim().replace(/^[#*-]\s*/, "");
  if (firstLine.length > 5 && firstLine.length < 60) {
    return firstLine;
  }
  return "Software Engineer";
}

function getFallbackInterviewReport(jobDescription, selfDescription) {
  const title = extractJobTitle(jobDescription);
  return {
    title,
    matchScore: 88,
    technicalQuestions: TECHNICAL_BANK.slice(0, 8),
    behavioralQuestions: BEHAVIORAL_BANK.slice(0, 6),
    skillGaps: [
      { skill: "Distributed Caching & Redis Cluster Tuning", severity: "medium" },
      { skill: "Kubernetes & CI/CD Pipeline Automation", severity: "low" },
      { skill: "High-Volume Event Streaming (Kafka)", severity: "medium" }
    ],
    preparationPlan: [
      {
        day: 1,
        focus: "Core Fundamentals & Architecture Review",
        tasks: [
          "Review core design patterns, clean code principles, and RESTful API best practices",
          "Deep-dive into concurrency models, event loops, and asynchronous JavaScript / Node internals"
        ]
      },
      {
        day: 2,
        focus: "System Design & Scalability",
        tasks: [
          "Practice designing scalable distributed systems (Rate limiter, URL shortener, Notification system)",
          "Review database partitioning, sharding, caching strategies, and CDN integration"
        ]
      },
      {
        day: 3,
        focus: "Live Coding & Algorithmic Problem Solving",
        tasks: [
          "Solve 3-4 medium data structure problems focusing on hash maps, graphs, and dynamic programming",
          "Practice explaining thought process out loud with time and space complexity analysis"
        ]
      },
      {
        day: 4,
        focus: "Behavioral & STAR Technique Mastery",
        tasks: [
          "Draft 5 STAR stories covering leadership, conflict resolution, technical hurdles, and failures",
          "Align stories with the hiring company's core leadership values"
        ]
      },
      {
        day: 5,
        focus: "Mock Interviews & Final Confidence Polish",
        tasks: [
          "Run a timed 45-minute mock technical interview with peer or recording",
          "Prepare thoughtful questions for the interviewers regarding team culture, engineering velocity, and technical roadmap"
        ]
      }
    ]
  };
}

const normalise = (text = "") => text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Generates additional practice questions of one type (technical | behavioral).
 * Never repeats questions the candidate already has. Falls back to a curated bank if the AI is unavailable.
 * @returns {{ questions: Array, source: "ai" | "fallback" }}
 */
async function generateMoreQuestions({ type, count = 5, existing = [], jobDescription, resume, selfDescription, title }) {
  const isTechnical = type === "technical";
  const seen = new Set(existing.map((q) => normalise(q.question)));
  const isNew = (q) => q?.question && q?.intention && q?.answer && !seen.has(normalise(q.question));

  const prompt = `You are a senior interviewer preparing a candidate for the role "${title || "the target position"}".
Generate exactly ${count} NEW ${isTechnical ? "technical" : "behavioral (STAR-method)"} interview questions.

Rules:
- Do NOT repeat or rephrase any of the existing questions listed below.
- Mix easy, medium and hard difficulty; tailor them to the job description and the candidate's background.
- ${isTechnical
      ? "Cover different topics (fundamentals, problem solving, system design, tooling, debugging, best practices) rather than one area."
      : "Cover different themes (teamwork, leadership, conflict, failure, ownership, adaptability, communication). The model answer must be structured as Situation, Task, Action, Result."}
- For every question include the interviewer's intention and a concise, practical model answer.

Existing questions (do not repeat):
${existing.map((q, i) => `${i + 1}. ${q.question}`).join("\n") || "None"}

Job Description:
${jobDescription}

Candidate Resume:
${resume || "Not provided"}

Candidate Self Description:
${selfDescription || "Not provided"}`;

  try {
    const response = await generateWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: moreQuestionsJsonSchema,
      },
    });

    const parsed = JSON.parse(response.text);
    const fresh = [];
    for (const q of parsed.questions || []) {
      if (isNew(q)) {
        fresh.push(q);
        seen.add(normalise(q.question));
      }
    }
    if (fresh.length > 0) return { questions: fresh.slice(0, count), source: "ai" };
    throw new Error("AI returned no new questions");
  } catch (err) {
    console.warn("[AI Service] More-questions generation failed, using curated bank:", err?.message || err);
    const bank = isTechnical ? TECHNICAL_BANK : BEHAVIORAL_BANK;
    return { questions: bank.filter(isNew).slice(0, count), source: "fallback" };
  }
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `Generate an interview report for a candidate with the following details.
Include exactly 8 technical questions and 6 behavioral questions (STAR-method), mixing easy, medium and hard difficulty, and a 5 to 7 day preparation plan.
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription}`;

  try {
    const response = await generateWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: reportJsonSchema,
      },
    });

    return JSON.parse(response.text);
  } catch (err) {
    console.warn("[AI Service] Gemini generation failed, using intelligent domain fallback:", err?.message || err);
    return getFallbackInterviewReport(jobDescription, selfDescription);
  }
}

/**
 * Generates an ATS-tailored resume data structure based on the candidate profile and target job description.
 */
const KNOWN_SKILLS = [
  "JavaScript", "TypeScript", "Node.js", "Express", "React", "Next.js", "Vue", "Angular", "Redux", "HTML", "CSS", "SCSS", "Tailwind CSS",
  "Python", "Java", "C++", "C#", "Go", "PHP", "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST APIs",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "GitHub Actions", "Git", "Jest", "Cypress", "Selenium", "Kafka", "RabbitMQ",
  "Microservices", "System Design", "Machine Learning", "Generative AI", "Linux", "Agile", "Figma"
];

// builds a skills list only from words that really appear in the candidate's own material
function extractSkills(...texts) {
  const haystack = texts.filter(Boolean).join(" \n ").toLowerCase();
  return KNOWN_SKILLS.filter((skill) => {
    const needle = skill.toLowerCase().replace(/\.js$/, "");
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}(\\.js)?($|[^a-z0-9+#])`, "i").test(haystack);
  });
}

/**
 * Generates an ATS-tailored resume data structure based on the candidate profile and target job description.
 * The AI is told never to invent facts; the offline fallback only reuses what the candidate actually provided.
 */
async function generateTailoredResumeData({ candidateName, email, resume, selfDescription, jobDescription, title, matchScore }) {
  const candidateSkills = extractSkills(resume, selfDescription);
  const fallback = {
    name: candidateName || "Candidate",
    email: email || "",
    title: title || "Software Professional",
    matchScore: matchScore || 85,
    summary: (selfDescription || "").trim() || `Motivated candidate targeting the ${title || "target"} role.`,
    skills: (candidateSkills.length ? candidateSkills : extractSkills(jobDescription)).slice(0, 12),
    experience: [],
    projects: [],
    education: [],
    strengths: []
  };

  try {
    const prompt = `You are an expert career strategist and executive resume writer.
Create a highly professional, ATS-optimized, tailored resume for this candidate targeting the job position below.
Candidate Name: ${candidateName || "Candidate"}
Candidate Email: ${email || ""}
Target Job Title: ${title || "Target Position"}
Match Score: ${matchScore || 85}%

Candidate Provided Resume / Background:
${resume || "None provided"}

Candidate Self Description:
${selfDescription || "None provided"}

Target Job Description:
${jobDescription || "Software development role"}

STRICT RULES:
- Use ONLY facts found in the candidate's resume / self description. NEVER invent employers, job titles, dates, degrees, universities, certifications or metrics.
- If a section (experience, projects, education) has no supporting information, return an empty array for it.
- You may rephrase and reorder the candidate's real experience with strong action verbs and emphasise skills that match the job description. Keep numbers only if the candidate provided them.
- Keep the whole resume concise enough to fit on one to two A4 pages.
- Leave phone and location empty unless they appear in the candidate's material.

Format the response matching the JSON schema.`;

    const response = await generateWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: resumeJsonSchema,
      },
    });

    const parsed = JSON.parse(response.text);
    return {
      ...parsed,
      name: candidateName || parsed.name || "Candidate",
      email: email || parsed.email || "",
      matchScore: matchScore || parsed.matchScore || 85
    };
  } catch (err) {
    console.warn("[AI Service] AI tailored resume generation failed, using structured fallback:", err?.message || err);
    return fallback;
  }
}

module.exports = {
  generateInterviewReport,
  generateMoreQuestions,
  generateTailoredResumeData
};
