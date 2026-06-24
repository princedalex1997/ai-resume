const ApiError = require("../utils/ApiError");

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    console.dir(result.error.format(), { depth: null });


    if (!result.success) {
      console.log("Validation failed:");
      console.log(result.error.flatten());
      return next(ApiError.badRequest("Validation Error", result.error.issue));
    }
    req[source] = result.data;
    next();
  };

module.exports = { validate };
