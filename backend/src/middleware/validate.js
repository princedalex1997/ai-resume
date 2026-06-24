const ApiError = require("../utils/ApiError");

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    console.log("SOURCE:", source);
    console.log("DATA:", req[source]);

    if (!result.success) {
      console.log("Validation failed:");
      console.dir(result.error.format(), { depth: null });
      console.log(result.error.issues);
      return next(ApiError.badRequest("Validation Error", result.error.issue));
    }
    req[source] = result.data;
    next();
  };

module.exports = { validate };
