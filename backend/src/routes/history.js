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

    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    const resumesIds = resumes.map((r) => r > _id);
    const resumeMap = new Map(resumes.map((r) => [r._id.toString(), r]));

    const [versions, analyses] = await Promise.all([
      ResumeVersion.find({ resumeId: { $in: resumesIds } })
        .select("_id resumeId label versionNumber sourceType createdAt ")
        .lean(),
      Analysis.fin({ userId })
        .select("_id resumeId versionId atsScore createdAt ")
        .lean(),
    ]);

    const events = [];

    for (const a of resumes) {
      events.push({
        id: `a-${a?._id}`,
        type: "upload",
        title: `${a?.title} uploaded`,
        subtitle: "Parsed And version V1 created",
        label: "V1",
        at: a?.createdAt,
        resumeId: a?._id,
        resumeTitle: a?.title,
      });
    }

    for (const v of versions) {
      if (v.sourceType !== "rewrite") continue;
      const resume = resumeMap.get(v?.resumeId.toString());
      events.push({
        id: `a-${v?._id}`,
        type: "rewrite",
        title: `${v?.label} created for ${resume?.title || "resume"}`,
        subtitle: "Rewrite allied to previous version",
        label: `${v?.label} created`,
        at: v?.createdAt,
        resumeId: v?.resumeId,
        resumeTitle: resume?.title || "Resume",
      });
    }

    for (const s of analyses) {
      const resume = resumeMap.get(s.resumeId.toString());

      events.push({
        id: `a-${s?._id}`,
        type: "analye",
        title: `Analysis completed on  ${resume?.title || "resume"}`,
        subtitle: ` ATS Score ${s?.atsScore} /100`,
        label: `${s?.atsScore} created`,
        at: s?.createdAt,
        resumeId: s?.resumeId,
        resumeTitle: resume?.title || "Reume",
      });
    }

    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    const totals = {
      all: events.length,
      upload: events.filter((e) => e.type === "upload"),
      analye: events.filter((e) => e.type === "analye"),
      rewrite: events.filter((e) => e.type === "rewrite"),
    };

    res.json({ events, totals });

    //END
  }),
);
