const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());
app.use(cookieParser());

// Allow Vite dev server and production clients
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
            return callback(null, true);
        }
        callback(null, true); // Dev convenience
    },
    credentials: true,
}));

// Health check endpoint
app.get("/api/health", (req, res) => {
    const dbStateMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };

    res.status(200).json({
        status: "ok",
        service: "GenAI Interview Strategy & Resume Platform",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: dbStateMap[mongoose.connection.readyState] || "unknown",
        models: {
            configured: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
            engine: "Google GenAI SDK"
        }
    });
});

// Require all routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

// Mount routes
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// Central error handler
app.use((err, req, res, next) => {
    console.error("[Server Error]", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});

module.exports = app;
