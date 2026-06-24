const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpressin });
}
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

const cookiesOptions = {
  httpOnly: true,
  secure: env.isProd ? "none" : "lax",
  maxage: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

module.exports = { signToken, verifyToken, cookiesOptions };
