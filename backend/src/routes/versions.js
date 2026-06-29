const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requiredAuth } = require("../middleware/auth");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const router = express.Router();
router.use(requiredAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    console.log("user id :", userId);
    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    const resumesIds = resumes.map((r) => r?._id);
    const resumeMap = new Map(resumes.map((r) => [r._id.toString(), r]));

    const versions = await ResumeVersion.find({ resumeId: { $in: resumesIds } })
      .select(
        "_id resumeId label versionNumber sourceType createdAt  latestAnalysisId parentVersionId ",
      )
      .sort({ createdAt: -1 })
      .lean();

    const analysisIds = versions
      .map((v) => v?.latestAnalysisId)
      .filter(Boolean);

    const analyses = analysisIds.length
      ? await Analysis.find({ _id: { $in: analysisIds } })
          .select("_id atsScore versionId")
          .lean()
      : [];

    const scoreByVersion = new Map(
      analyses.map((v) => [v?.versionId?.toString(), v?.atsScore]),
    );

    const items = versions.map((v) => {
      const resume = resumeMap.get(v?.resumeId?.toString());
      return {
        id: v?._id,
        label: v?.label,
        versionNumber: v?.versionNumber,
        sourceType: v?.sourceType,
        createdAt: v?.createdAt,
        score: scoreByVersion.get(v?._id?.toString()) ?? null,
        resumeId: v?.resumeId,
        resumeTitle: resume?.title || "Resume",
        parentVersionId: v?.parentVersionId,
      };
    });

    const totals = {
      all: items.length,
      uploads: items.filter((v) => v.sourceType === "upload").length,
      rewrite: items.filter((v) => v.sourceType === "rewrite").length,
    };
    //END

    res.json({
      versions: items,
      totals,
    });
  }),
);

module.exports = router;
