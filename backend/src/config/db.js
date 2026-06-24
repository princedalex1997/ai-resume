const mongoose = require("mongoose")
// const { default: mongoose } = require("mongoose");
const env = require("./env");
const colors = require("colors")


mongoose.set("strictQuery", true);

async function connectDB() {
  const conn = await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
  });

  console.log(
    `MongoDB Connected : ${conn.connection.host}/${conn.connection.name}`.yellow.bold
  );

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB Error", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("Mongodb Disconnected");
  });
}

module.exports = { connectDB };
