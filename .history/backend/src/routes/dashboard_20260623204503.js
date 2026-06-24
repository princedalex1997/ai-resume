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

        const latestResumeMeta = resumes[0] || null;
        let latestResume = null;
        let scoreSeries = [];
        let versionStack = [];

        if (latestResumeMeta) {
            const versions = await ResumeVersion.find({
                resumeId: latestResumeMeta._id
            }).sort({ versionNumber: 1 }).lean()

            const analysisIds = version.map((v) => v.latestAnalysisId).filter(Boolean);
            const analyses = analysisIds.length ?
                await Analysis.find({ _id: { $in: analysisIds } }).select("_id atsScore versionId createdAt").lean() : [];

            const scoreByVersion = new Map(
                analyses.map((a) => [a.versionId.toString(), a.atsScore])
            )

            const versionsWithScores = versions.map((v) => ({
                id: v?._id,
                label: v?.label,
                versionNumber: v?.sourceType,
                createdAt: v?.createdAt,
                score: scoreByVersion.get(v?._id.toString()) ?? null,
            }))

            latestResume = {
                _id: latestResumeMeta?._id,
                title: latestResumeMeta?.title,
                latestVersionNumber: latestResumeMeta?.latestVersionNumber,
                updatedAt: latestResumeMeta?.updatedAt,
                currentVersionId: latestResumeMeta?.currentVersionId,
            }

            scoreSeries = versionsWithScores.filter((v) => v.score !== null).map((v) => ({
                label: v?.label,
                score: v?.score,
                versionId: v?.id,
                at: v?.createdAt
            }))

            const last3 = versionsWithScores.slice(-3);
            versionStack = last3.map((v, i, arr) => {
                const prev = arr[i - 1];
                const data = v.score !== null && prev?.score !== null ? v.score - prev.score : 0;

                return {
                    id: v?.id,
                    label: v?.label,
                    titel:
                        v.sourceType === "upload" ? "Upload" : v?.sourceType === "rewrite" ? "Rewrite Pass" : v.label,
                    score: v?.score ?? 0,
                    delta,
                }
            })
        }

        // API derived from history
        const allAnalysis = await Analysis.find({ userId }).select("atsScore keywordsPresent keywordsMissing issues createdAt resumeId").sort({ createdAt: -1 }).lean();
        const latestAnalysis = allAnalysis[allAnalysis.length - 1] || null;
        const prevAnalysis = allAnalysis[allAnalysis.length - 2] || null;

        const scoreSpark = allAnalysis.slice(-10).map((a) => ({ v: a.atsScore }));
        const versionsSpark = resumes.slice(0, 10).reverse()
            .map((r) => ({ v: r.latestVersionNumber || 1 }));

        const keywordsSpark = allAnalysis.slice(-10).map((a) => ({ v: (a?.keywordsPresent || []).length }))

        const issuesSpark = allAnalysis.slice(-10).map((a) => ({ v: (a?.issues || []).length }))

        const kpi = {
            atsScore: {
                value: latestAnalysis?.atsScore ?? null,
                delta: latestAnalysis && prevAnalysis ? latestAnalysis?.atsScore - prevAnalysis.atsScore : null,
                spark: versionsSpark,
            },
            versions: {
                value: resumes.reduce((sum, r) => sum + (r.latestVersionNumber || 1), 0),
                delta: null,
                spark: versionsSpark,
            },
            issueIdentified: {
                value: latestAnalysis ? latestAnalysis?.issues?.length || 0 : null,
                delta: latestAnalysis && prevAnalysis ? (latestAnalysis?.issues?.length || 0) - (prevAnalysis.issues?.length || 0) : null,
                spark: issuesSpark
            },
            keywordsMatched: {
                value: latestAnalysis ? latestAnalysis?.keywordsPresent?.length || 0 : null,
                total: latestAnalysis ? (latestAnalysis?.keywordsPresent?.length || 0) + (latestAnalysis?.keywordsMissing?.length || 0) : null,
                delta: latestAnalysis && prevAnalysis ? (latestAnalysis?.keywordsPresent?.length || 0) - (prevAnalysis.keywordsMissing?.length || 0) : null,
                spark :keywordsSpark,
            }
        }

    })
)