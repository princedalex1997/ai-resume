const { GoogleGenAI, Type } = require("@google/genai");
const { z, email } = require("zod");

const envt = require("../config/env");

const ai = env.geminiApiKey
  ? new GoogleGenAI({
      apiKey: env.geminiApiKey,
    })
  : null;

const linkSchema = {
  type: Type.OBJECT,
  required: ["label", "url"],
  properties: {
    label: { type: Type.STRING },
    url: { type: Type.STRING },
  },
};

const responseSchema = {
  type: Type.OBJECT,
  required: [
    "basics",
    "summary",
    "experience",
    "education",
    "skills",
    "projects",
    "certifications",
    "languages",
    "interests",
  ],
  properties: {
    basics: {
      type: Type.OBJECT,
      required: ["name", "title", "location", "email", "phone", "links"],
      properties: {
        name: { type: Type.STRING },
        title: { type: Type.STRING },
        location: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        links: {
          type: Type.ARRAY,
          items: linkSchema,
        },
      },
    },

    summary: {
      type: Type.STRING,
    },

    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["company", "role", "period", "bullets"],
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          location: { type: Type.STRING },
          period: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      },
    },

    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["degree", "school", "period"],
        properties: {
          degree: { type: Type.STRING },
          school: { type: Type.STRING },
          location: { type: Type.STRING },
          period: { type: Type.STRING },
          details: { type: Type.STRING },
        },
      },
    },

    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },

    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["name", "description"],
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tech: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
          links: {
            type: Type.ARRAY,
            items: linkSchema,
          },
        },
      },
    },

    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["name"],
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          year: { type: Type.STRING },
        },
      },
    },

    languages: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },

    interests: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
    },
  },
};

const validator = z.object({
  basics: z.object({
    name: z.string().default(""),
    title: z.string().default(""),
    location: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
  }),

  summary: z.string().default(""),

  experience: z
    .array(
      z.object({
        company: z.string().default(""),
        role: z.string().default(""),
        location: z.string().default(""),
        period: z.string().default(""),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),

  education: z
    .array(
      z.object({
        degree: z.string().default(""),
        school: z.string().default(""),
        location: z.string().default(""),
        period: z.string().default(""),
        details: z.string().default(""),
      }),
    )
    .default([]),

  skills: z.array(z.string()).default([]),

  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        tech: z.array(z.string()).default([]),
        links: z
          .array(z.object({ label: z.string(), url: z.string() }))
          .default([]),
      }),
    )
    .default([]),

  certifications: z
    .array(
      z.object({
        name: z.string().default(""),
        issuer: z.string().default(""),
        year: z.string().default(""),
      }),
    )
    .default([]),

  languages: z.array(z.string()).default([]),

  interests: z.array(z.string()).default([]),
});

function buildPrompt(rawText) {
  return [
    "You are a resume parser. The input is Text extracted from a PDF - lines may be jumbled or out of natural reading order.",
    "",
    "Extract structured data:",
    '-basics:name, professional title, location, email phone, social links (Linkedin / Portfolio /  Github  etc.label like "LinkedIn" , full URL)',
    "-summary:the professional summary paragraph (rejoin if split across lines)",
    "-education:degree, school, period,location, optional details",
    "-experience: company, role, location, period, bullet points describing responsibilities and achievements",
    "-skills:flat array of technical skills",
    "-projects:name, one-sentence description, optional tech tags, optional links",
    "-certifications:name.issuer,year",
    "-languages:flat array",
    "-interests: flat array",
    "",
    "Rules:",
    "-Be conservative :omit fields that are not clearly present . use empty strings/arrays where missing.",
    "-Do not invent or paraphrase - extract verbatim where possible.",
    "-Each experience bullet should read as a complete sentence",
    "-Preserve Original date formats (e.g. 'Jan 2021 - Dec 2025')",
    "",
    "RESUME TEXT:",
    "----------",
    rawText,
    "----------",
  ].join("\n");
}

const EMPTY = {
  basics: {
    name: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    links: [],
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  interests: [],
};

async function parseResume(rawText) {
  if (!ai || !rawText?.trim()) return EMPTY;

  const prompt = buildPrompt(rawText);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await ai.models.generateContent({
        model: env.geminiModal,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.1,
        },
      });

      const text =
        typeof result.text === "function"
          ? result.text()
          : result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Response");
      const parsed = JSON.parse(text);
      const validated = validator.safeParse(parsed);
      if (validated.success) {
        return validated.data;
      }
      throw new Error(validated.error.message);
      //   return validator.parse(parsed);
    } catch (err) {
      if (attempt === 2) {
        console.log("Structured parse failed :", err.message);
        return EMPTY;
      }
    }
  }
  return EMPTY;
}

module.exports = { parseResume };
