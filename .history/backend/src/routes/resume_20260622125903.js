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
const { extractText } = require("../services/pdfService");
const {
    parseResume: parseStructured,
} = require("../services/structuredParser");

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
    const version = await Resume.findOne({
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

router.get("/:id/versions/:versionId",
    validate(
        z.object({ id: objectIdSchema, versionId: objectIdSchema }), "params"
    ),
    asyncHandler(async (req, res) => {
        const resume = await loadOwnResume(req);
        const version = await loadVersion(resume._id, req.params.versionId)
        res.json({ version })
    })
)

router.delete("/:id",
    validate(idParam,"params"),
    asyncHandler(async(req,res)=>{
        const resume = await loadOwnResume(req);
        await ResumeVersion.deleteMany({resumeId:resume._id});
        await resume.deleteOne();
        res.json({ok: true})
    })
)

module.exports = router