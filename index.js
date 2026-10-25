import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import mailRoutes from "./routes/mail.routes.js";

const app = express();
const port = process.env.PORT || 6969;

app.use(cors());
app.use(express.json());

// Ensure MongoDB connection before handling API routes
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({
            success: false,
            message: "Database connection failed: " + err.message
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/mails", mailRoutes);

app.get("/", (req, res) => {
    res.send("Cold Mailer API is running...");
});

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log("Server is running on port " + port);
    });
}

export default app;


