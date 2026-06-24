const express = require("express")
const asyncHandler = require("../utils/asyncHandler")
const { requiredAuth } = require("../middleware/auth")
const Resume = require("../models/Resume")
const ResumeVersion = require("../models/ResumeVersion")
const Analysis = require("../models/Analysis")

const router = express.Router()
router.use(requiredAuth);

router.get("/",

    asyncHandler(async (req, res) => {
        const userId = req.user?._id;

        const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 }).lean();
        const resumeIds = resumes.map(v => v._id);

        const [rewriteCount, analysisCount] = await Promise.all([
            ResumeVersion.countDocuments({
                resumeId: { $in: resumeIds },
                sourceType: "rewrite"
            }),
            Analysis.countDocuments({ userId })
        ]),
    })
)