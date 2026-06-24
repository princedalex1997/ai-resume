const mongoose = require("mongoose")

const issueSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        serverity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
        explanation: String,
        fix: String
    },
    {
        _id: false
    }
);

const strengthSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        evidence: String,
    },
    {
        _id: false
    }
)

const bulletReWriteScheam = new mongoose.Schema(
    {
        section: String,
        original: { type: String, required: true },
        rewritten: { type: String, required: true },
        rationale: String
    },
    {
        _id: true
    }
)