const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");

async function requiredAuth(req, res, next) {
  try {
    const token = req.cookies?.[env.cookieName];
    // console.log("Cookies:", req.cookies);
    // console.log("Cookie Name:", env.cookieName);
    // console.log("Token:", req.cookies?.[env.cookieName]);
    // console.log("Header Cookie:", req.headers.cookie);
    if (!token) throw ApiError.unauthorized("Token Not Found");

    const payload = verifyToken(token);
    //find user from DB;
    const user = await User.findById(payload.sub);

    if (!user) throw ApiError.unauthorized("Session no Longer");

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpriedError") {
      return next(ApiError.unauthorized("Invalid or Experied Session"));
    }
    next(err);
  }
}

module.exports = { requiredAuth };
