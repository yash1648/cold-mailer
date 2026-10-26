import jwt from "jsonwebtoken";
import User from "../model/auth.model.js";

const unauthorized = (res, message) =>
    res.status(401).json({
        success: false,
        message: message || "Unauthorized",
    });

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return unauthorized(res, "Unauthorized: token missing or malformed");
        }

        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
            return unauthorized(res, "Unauthorized: token missing or malformed");
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.userId) {
            return unauthorized(res, "Unauthorized: invalid token");
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return unauthorized(res, "Unauthorized: user no longer exists");
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return unauthorized(res, "Session expired. Please sign in again.");
        }

        if (error.name === "JsonWebTokenError") {
            return unauthorized(res, "Unauthorized: invalid token");
        }

        console.error("Auth middleware error:", error.message);
        return unauthorized(res, "Unauthorized");
    }
};
