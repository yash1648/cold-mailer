import jwt from "jsonwebtoken";
import User from "../model/auth.model.js";

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized: Token missing or malformed",
                success: false
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                message: "User not found",
                success: false
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth middleware error: " + err.message);
        return res.status(401).json({
            message: "Unauthorized user",
            success: false
        });
    }
};