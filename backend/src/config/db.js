
const mongoose = require("mongoose");

async function connectToDB() {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        throw new Error("MONGO_URI is missing from environment variables");
    }

    try {
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("[Database] MongoDB connected successfully");
    } catch (error) {
        console.error("[Database] Connection failed:", error.message);
        throw error;
    }
}

module.exports = connectToDB;
