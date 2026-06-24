const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const useScheme = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true, maxlength: 80 },
        email: {
            type: String,
            required: [true, "Email is Required"],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: { type: String, required: true, selecte: false },
    },
    { timestamps: true },
);

useScheme.statics.hashPassword = function (plain) {
    return bcrypt.hash(plain, 12);
};
useScheme.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

useScheme.methods.json = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj__v;
    return obj;
};

module.exports = mongoose.model("User", useScheme);
