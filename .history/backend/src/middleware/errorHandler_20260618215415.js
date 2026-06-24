const env = require("../config/env");
const ApiError = require("../utils/ApiError");

function notFound(req, res, next) {
  next(ApiError.notFound(`Route : ${req.method} ${req.orginalUrl} not found`));
}

function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details;

  if (err.name === "ValidationError") {
    status = 400;
    details = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
    message = "Validation Error";
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.values}`;
  } else if (err.name === 11000) {
    status = 409;
    message = "Duplicate Key";
    details = err.details;
  } else if (err.name === "ZodError") {
    status = 400;
    message = " Validation Failed";
    details = err.issues;
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.orginalUrl}]`, err);
  }

  res.status(status).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(env.isProd ? {} : { stack: err.stack }),
    },
  });
}

module.exports = { errorHandler, notFound };
