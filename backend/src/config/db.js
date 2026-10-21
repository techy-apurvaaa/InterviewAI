const mongoose = require("mongoose");

/**
 * Connects to MongoDB with automatic fallback.
 * 1. Attempts process.env.MONGO_URI (configured in .env)
 * 2. If it fails (e.g. Atlas IP whitelist restriction), automatically falls back to local MongoDB
 */
async function connectToDB() {
    const primaryUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/genai";
    const localUri = "mongodb://127.0.0.1:27017/genai";

    try {
        console.log(`[Database] Attempting connection to MongoDB...`);
        await mongoose.connect(primaryUri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✓ [Database] Connected successfully to: ${primaryUri.includes("@") ? "MongoDB Atlas (Remote Cluster)" : primaryUri}`);
        return true;
    } catch (primaryErr) {
        console.warn(`! [Database] Primary connection failed: ${primaryErr.message}`);

        // If primary was already local, rethrow
        if (primaryUri === localUri) {
            console.error(`✕ [Database] Local MongoDB is also unreachable. Please ensure MongoDB service is running.`);
            return false;
        }

        console.log(`[Database] Attempting fallback to local MongoDB (${localUri})...`);
        try {
            await mongoose.connect(localUri, {
                serverSelectionTimeoutMS: 4000,
            });
            console.log(`✓ [Database] Connected successfully to fallback local database: ${localUri}`);
            return true;
        } catch (localErr) {
            console.error(`✕ [Database] Both primary and local MongoDB connections failed:`);
            console.error(`   Primary error: ${primaryErr.message}`);
            console.error(`   Local error:   ${localErr.message}`);
            return false;
        }
    }
}

module.exports = connectToDB;