const express = require("express");
const { z } = require("zod");
const mongoose = require("mongoose");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { requiredAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadPdf } = require("../middleware/upload");

const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");

const { analyzeLimiter } = require("../middleware/rateLimit");
const Analysis = require("../models/Analysis");
const { analyzeResume } = require("../services/geminiService");

const { extractText } = require("../services/pdfService");
const {
  parseResume: parseStructured,
} = require("../services/structuredParser");
const { parse } = require("zod/v4/core");
const { diffText, summarized } = require("../services/diffService");

const router = express.Router();

router.use(requiredAuth);

const objectIdSchema = z
  .string()
  .refine((v) => mongoose.isValidObjectId(v), { message: "Invalid id" });

const idParam = z.object({ id: objectIdSchema });

async function loadOwnResume(req) {
  const resume = await Resume.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!resume) throw ApiError.notFound("Resume not Found");
  return resume;
}
async function loadVersion(resumeId, versionId) {
  const version = await ResumeVersion.findOne({
    _id: versionId,
    resumeId,
  });
  if (!version) throw ApiError.notFound("Version not Found");
  return version;
}

router.post(
  "/",
  uploadPdf("file"),
  asyncHandler(async (req, res) => {
    const { text, meta } = await extractText(req.file.buffer);
    const parsedSelection = await parseStructured(text);

    console.log("req.file:".bgBlue, req.file);

    const title =
      (req.body.title || "").trim() ||
      req.file?.originalname?.replace(/\.pdf$/i, "") ||
      "Untitled Resume";

    const resume = await Resume.create({
      userId: req.user._id,
      title,
      latestVersionNumber: 1,
    });

    const version = await ResumeVersion.create({
      resumeId: resume._id,
      versionNumber: 1,
      label: "V1",
      rawText: text,
      parsedSelection,
      sourceType: "upload",
      parentVersionId: null,
    });

    resume.currentVersionId = version._id;
    await resume.save();

    res.status(201).json({ resume, version, meta });
  }),
);

// list

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const resume = await Resume.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ resume });
  }),
);

router.get(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);
    const versions = await ResumeVersion.find({ resumeId: resume._id })
      .sort({ versionNumber: 1 })
      .select("-rawText")
      .lean();
    res.json({ resume, versions });
  }),
);

router.get(
  "/:id/versions/:versionId",
  validate(
    z.object({ id: objectIdSchema, versionId: objectIdSchema }),
    "params",
  ),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);
    const version = await loadVersion(resume._id, req.params.versionId);
    res.json({ version });
  }),
);

router.delete(
  "/:id",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);
    await ResumeVersion.deleteMany({ resumeId: resume._id });
    await Analysis.deleteMany({ resumeId: resume._id });
    await resume.deleteOne();
    res.json({ ok: true });
  }),
);

const analyzeBody = z
  .object({
    versionId: objectIdSchema.optional(),
    targetRole: z.string().trim().max(120).optional(),
  })
  .optional();

router.post(
  "/:id/analyze",
  analyzeLimiter,
  validate(idParam, "params"),
  validate(analyzeBody),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);

    // Ensure body is always an object
    const body = req.body || {};

    const versionId = body.versionId || resume.currentVersionId;

    if (!versionId) {
      throw ApiError.badRequest("No Version to Analyze");
    }

    const version = await loadVersion(resume._id, versionId);

    const { analysis, model, promptTokens, responseTokens } =
      await analyzeResume({
        rawText: version.rawText,
        targetRole: body.targetRole,
      });

    const saved = await Analysis.create({
      userId: req.user._id,
      resumeId: resume._id,
      versionId: version._id,
      atsScore: analysis.atsScore,
      scoreBreakdown: analysis.scoreBreakdown,
      issues: analysis.issues,
      strengths: analysis.strengths,
      bulletRewrites: analysis.bulletRewrites,
      keywordsPresent: analysis.keywordsPresent,
      keywordsMissing: analysis.keywordsMissing,
      model,
      promptTokens,
      responseTokens,
    });

    version.latestAnalysisId = saved._id;
    await version.save();

    res.status(201).json({
      success: true,
      analysis: saved,
    });
  }),
);

router.get(
  "/:id/analysis",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);
    const analyses = await Analysis.find({ resumeId: resume._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ analyses });
  }),
);

router.get(
  "/id/analysis/:versionId/analysis",
  validate(
    z.object({ id: objectIdSchema, versionId: objectIdSchema }),
    "params",
  ),
  asyncHandler(async (req, res) => {
    const resume = await loadOwnResume(req);
    const version = await loadVersion(resume._id, req.params.versionId);
    const analysis = await Analysis.findOne({
      resumeId: resume._id,
      versionId: version._id,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ analyses });
  }),
);

const rewriteBody = z.object({
  analysisId: objectIdSchema,
  rewriteIds: z.array(objectIdSchema).optional(),
  label: z.string().trim().max(40).optional(),
});

function applyRewritesToText(rawText, rewrites) {
  let result = rawText;
  for (const r of rewrites) {
    if (!r.original || !r.rewritten) continue;
    const idx = result.indexOf(r.original);
    if (idx >= 0) {
      result =
        result.slice(0, idx) +
        r.rewritten +
        result.slice(idx + r.original.length);
    } else {
      result += `\n${r.rewritten}`;
    }
  }
  return result;
}

function patchBulletesInSection(sections, rewrites) {
  if (!sections) return null;
  const cloned = JSON.parse(JSON.stringify(sections));

  for (const r of rewrites) {
    if (!r.original || !r?.rewritten) continue;
    if (Array.isArray(exp.bullets)) continue;
    exp.bullets = exp.bullets.map((b) => (b === r.original ? r.written : b));
  }
  return cloned;
}

function looksEmpty(sections) {
  if (!sections) return true;
  const b = sections.basics || {};
  const hasIdentity = b.name || b.email || b.title;

  const hasBody =
    sections.summary ||
    sections.experience?.length ||
    sections.education?.length ||
    sections.skills?.length;
  return !hasIdentity && !hasBody;
}

router.post(
  "/:id/rewrite",
  validate(idParam, "prams"),
  validate(rewriteBody),
  asyncHandler(async (req, res) => {

    const resume = await loadOwnResume(req);
    const analysis = await Analysis.findOne({
      _id: req.body?.analysisId,
      resumeId: resume?._id
    })

    if (!analysis) throw ApiErr.notFound("Analysis Not found")

    const baseVersion = await loadVersion(resume._id, analysis.versionId);

    const selected = req.body?.rewriteIds?.length ? analysis.bulletRewrites.filter((r) => req.body?.rewriteIds.includes(r?._id.toString()))
      : analysis.bulletRewrites;

    if (!selected.length) {
      throw ApiErr.badRequest("No rewrites selected to apply")
    }

    const newRaw = applyRewritesToText(baseVersion.rawText, selected)

    const patchedFromBase = patchBulletesInSection(baseVersion.parsedSelection, selected);

    const reparsed = await parseStructured(newRaw);
    const finalParsed = looksEmpty(reparsed) ? patchedFromBase : reparsed;

    const nextNumber = resume.latestVersionNumber + 1;

    const newVersion = await ResumeVersion.create({
      resumeId: resume?._id,
      versionNumber: nextNumber,
      label: req.body?.label?.trim() || ` V${nextNumber}`,
      rawText: newRaw,
      parsedSelection: finalParsed,
      sourceType: "rewrite",
      parentVersionId: baseVersion?._id
    })

    resume.latestVersionNumber = nextNumberl
    resume.currentVersionId = newVersion?._id

    res.status(201).json({
      version: newVersion,
      appliedCount: selected.length
    })
  })
)

const diffQuery = z.object({
  from: objectIdSchema,
  to: objectIdSchema,
  mode: z.enum(["words", "lines"]).optional()
})



router.get(
  "/:id/diff",
  validate(idParams, "params"),
  validate(diffQuery, "query"),
  asyncHandler(async (req, res) => {
    const resume = loadOwnResume(req);
    const [fromV, toV] = await Promise.all([
      loadVersion(resume?._id, req.query.from),
      loadVersion(resume?._id, req.query.to),
    ])

    const parts = diffText(fromV.rawText, toV.rawText, req.query.mode);
    res.json({
      from: { id: fromV._id, label: fromV?.label, versionNumber: fromV.versionNumber },
      to: { id: to._id, label: to?.label, to: fromV.versionNumber },
      parts,
      stats: summarized(parts)
    })


  })
)


module.exports = router;
