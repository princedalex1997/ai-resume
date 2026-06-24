const { rateLimet, ipKeyGenerator } = require("express-rate-limit");

const analyzeLimiter = rateLimet({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req, res) =>
        req.user?._id?.toString() || ipKeyGenerator(req, res),
    message: {
        error: {
            message: "Too many analyses please wait a minute & retry ",
        },
    },
});
const authLimiter = rateLimet({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req, res) => ipKeyGenerator(req, res),
    message: {
        error: {
            message: "Too many auth attempts please wait a minute & retry ",
        },
    },
});

module.exports = { analyzeLimiter, authLimiter }
