const env = require("../config/env");
const user = require("../models/User");
const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");


async function requiredAuth (req,res,next) {
    try {
        const token = req.cookies?.[env.cookieName];
        if(!token) throw ApiError.unauthorized()

        const payload = verifyToken(token);
       //find user from DB;
       const user = await user

    } catch (error) {
        
    }
}