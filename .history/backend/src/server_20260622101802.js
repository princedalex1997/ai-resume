const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookiesParse = require("cookie-parser");
const morgan = require("morgan");
const colors = require("colors");

const env = require("./config/env");
const { connectDB } = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const healthRouter = require("./routes/health");

// URL : http://localhost:5000/api/auth/register
const authRouter = require("./routes/auth")
const resumeRouter = require("./routes/resume")

const app = express();
// const PORT = process.env.PORT || 5000;

app.set("trust-proxy", 1);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookiesParse());

if (!env.isProd) app.use(morgan("dev"));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/resumes", resumeRouter);


app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(
        `Server Running Successfully: LocalHost:${env.port}`.green.bold,
      );
    });
  } catch (error) {
    console.error("Server not Connected".red.bold, error.message || error);
    process.exit(1);
  }
}

process.on("unhandledRejection", (res) => {
  console.error("unhandled Rejection", res);
});
start();

module.exports = app;
