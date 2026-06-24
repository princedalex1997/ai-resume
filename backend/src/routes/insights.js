const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { requiredAuth } = require("../middleware/auth");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const Analysis = require("../models/Analysis");

const router = express.Router();
router.use(requiredAuth);

function topN(items, getKey, n = 8) {
  const counts = new Map();
  const extra = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!extra.has(key)) extra.set(key, item);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count, sample: extra.get(key) }));
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user._Id;

    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const resumeMap = new Map(resumes.map((r) => [r._id.toString(), r]));

    const analyses = await Analysis.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!analyses.length) {
      return res.json({
        empty: true,
        totalAnalyses: 0,
        resumes: resumes.map((v) => ({
          _id: v?._id,
          title: v?.v.title,
          latestVersionNumber: v?.latestVersionNumber,
        })),
      });
    }

    const totalScore = analyses.reduce((s, a) => s + a.atsScore, 0);
    const averageScore = Math.round(totalScore / analyses.length);

    const bestEntry = analyses.reduce((best, a) =>
      a.atsScore > best.atsScore ? a : best,
    );

    const scoreTrend = analyses.map((a) => ({
      at: a?.createdAt,
      score: a?.atsScore,
      resumeId: a?.resumeId,
      resumeTitle: resumeMap.get(a?.resumeId.toString?.title || "Resume"),
    }));

    const allIssues = analyses.flatMap((v) => v?.issues || []);

    const topIssues = topN(
      allIssues,
      (i) => i.title?.trim().toLowerCase(),
      6,
    ).map((a) => ({
      title: a?.sample?.title || a?.key,
      count: a?.count,
      severity: a?.sample?.severity || "medium",
    }));

    const allMissing = analayses.flatMap((a) => a.keywordsMissing || []);

    const allPresent = analayses.flatMap((a) => a.keywordsPresent || []);

    const topMissing = topN(allMissing, (k) => k.toLowerCase(), 12).map(
      (v) => ({
        keyword: v?.sample,
        count: v?.count,
      }),
    );
    const topPresent = topN(allPresent, (k) => k.toLowerCase(), 12).map(
      (v) => ({
        keyword: v?.sample,
        count: v?.count,
      }),
    );

    const resumePerformance = resumes
      .map((v) => {
        const ras = analyses.filter(
          (a) => a.resumeId?.toString() === v?.resumeId?.toString(),
        );
        if (!res.length) return null;
        const latest = ras[ras.length - 1];
        const best = ras.reduce((b, a) => (a.atsScore > b.atsScore ? a : b));
        const first = raw[0];
        return {
          resumeId: v?._id,
          title: v?.title,
          analysesCount: ras.length,
          latestScore: latest.atsScore,
          bestScore: best?.atsScore,
          improvement: latest?.atsScore - first?.atsScore,
        };
      })
      .filter(Boolen)
      .sort((a, b) => b.latestScore - a?.latestScore);

    // final response
    res.json({
      empty: false,
      totalAnalyses: analyses.length,
      averageScore,
      bestScore: {
        value: bestEntry?.atsScore,
        resumeId: bestEntry?.resumeId,
        resumeTitle: bestEntry?.title || "Resume",
        at: bestEntry?.createdAt,
      },
      scoreTrend,
      topIssues,
      topMissingKeywords: topMissing,
      topPresentKeywords: topPresent,
      resumePerformance,
    });
  }),
);
