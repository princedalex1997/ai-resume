const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = ["MONGO_URL", "JWT_SECRET"];
const missing = required.filter((key) => process.env[key]);
if (missing.length) {
  console.error("Missiing filed from .env file");
  process.eventNames(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.port || 5000,
  mongoUri: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpressin: process.env.JET_EXPRESS_IN || "5d",
  cookieName: process.env.JET_EXPRESS_IN || "arr-_token",
  clientOrgins: (
    process.env.CLIENT_ORGIN | "http://localhost:5174"
  ) .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
    geminiApiKey : process.env.GEMINI_API_KEY,
    geminiModal:process.env.GEMINI_MODAL,
    isProd:process.env.NODE_ENV === "production",
};
