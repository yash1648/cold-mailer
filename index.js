import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import mailRoutes from "./routes/mail.routes.js";

const app = express();
const port = process.env.PORT || 6969;

app.disable("x-powered-by");
// Vercel terminates TLS in front of the function; trust one proxy hop so
// req.ip is the real client address for rate limiting.
app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins.length ? allowedOrigins : "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge: 86400,
    })
);

app.use(express.json({ limit: "1mb" }));

// Connect to MongoDB for API traffic only, so the health/root endpoints stay
// reachable even when the database is unavailable.
app.use("/api", async (req, res, next) => {
    try {
        await connectDB();
        return next();
    } catch (error) {
        console.error("Database middleware error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Database connection failed. Please try again shortly.",
        });
    }
});

app.get("/", (req, res) => {
    res.send("Cold Mailer API is running...");
});

app.get("/api/health", async (req, res) => {
    try {
        await connectDB();
        const healthy = mongoose.connection.readyState === 1;
        return res.status(healthy ? 200 : 503).json({
            success: healthy,
            status: healthy ? "ok" : "degraded",
            database: healthy ? "connected" : "disconnected",
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(503).json({
            success: false,
            status: "degraded",
            database: "disconnected",
            message: error.message,
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/mails", mailRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error.type === "entity.parse.failed") {
        return res.status(400).json({
            success: false,
            message: "Request body is not valid JSON",
        });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            success: false,
            message: "Request body is too large",
        });
    }

    console.error("Unhandled request error:", error);
    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log("Server is running on port " + port);
    });
}

// Node.js runtime on Vercel reads this export to allow long AI requests.
export const config = { maxDuration: 60 };

export default app;
