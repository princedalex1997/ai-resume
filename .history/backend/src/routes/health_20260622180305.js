const express = require("express");
const { default: mongoose } = require("mongoose");

const router = express.Router();

router.get("/", (req, res) => {
  const status = ["disconnected", "connected", "connectiong", "disconnecting"];

  res.json({
    status: "ok",
    uptime: process.uptime,
    db: status[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
