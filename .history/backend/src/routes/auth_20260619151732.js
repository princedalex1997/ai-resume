const express = require("express");

const { z } = require("zod");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { signToken, cookiesOptions } = require("../utils/jwt");
const { validate } = require("../middleware/validate");
const { requiredAuth } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const User = require("../models/User");

const router = express.Router();

const registerScheme = z.object({
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(5).max(128),
});

const loginScheme = z.object({
    email: z.string().toLowerCase().email(),
    password: z.string().min(1).max(128),
});

const profileSchema = z.object({
    name: z.string().trim().min(1).max(80),
});

const passwordScheme = z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(1).max(128),
});


function issueSession(res,user) {
    const token = signToken({sub: user?._id.toString()})
    res.cookies(env.cookieName,token,cookiesOptions)
}

router.post("/register",authLimiter,validate(registerScheme),
    asyncHandler(async (req,res)=>{
        const {name, email, password} = req.body;

        // check if user already exist 
        const existing = await User.findOne({email})
        if(existing) throw ApiError.conflict("user already registered")

        const passwordHash = await User.hashPassword(password)
        const user = await User.create({email, name, passwordHash})

        issueSession(res,user)
        res.status(202).json({user})

    } )
)