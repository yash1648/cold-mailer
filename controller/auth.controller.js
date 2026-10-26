import User from "../model/auth.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    // Kept for clients that read `user.user` from the original API.
    user: user.name,
    email: user.email,
    domain: user.domain ?? null,
    skills: user.skills ?? [],
});

const signToken = (user) =>
    jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

const normaliseSkills = (skills) => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
        return skills.map((skill) => String(skill).trim()).filter(Boolean);
    }
    if (typeof skills === "string") {
        return skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean);
    }
    return [];
};

export const registerUser = async (req, res) => {
    try {
        const { name, email, password, domain, skills } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        if (String(name).trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Name must be at least 3 characters long",
            });
        }

        if (!EMAIL_RE.test(String(email).trim())) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address",
            });
        }

        if (String(password).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured",
            });
        }

        const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "A user already exists with this email",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name: String(name).trim(),
            email: String(email).trim().toLowerCase(),
            password: hashedPassword,
            domain: domain ? String(domain).trim() : undefined,
            skills: normaliseSkills(skills),
        });

        return res.status(201).json({
            message: "User registered successfully",
            success: true,
            user: publicUser(user),
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A user already exists with this email",
            });
        }

        if (error?.name === "ValidationError") {
            return res.status(400).json({ success: false, message: error.message });
        }

        console.error("registerUser failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not create the account",
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select(
            "+password"
        );

        const invalidCredentials = () =>
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });

        if (!user) {
            return invalidCredentials();
        }

        const isMatch = await bcrypt.compare(String(password), user.password);
        if (!isMatch) {
            return invalidCredentials();
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured",
            });
        }

        return res.status(200).json({
            message: "User logged in successfully",
            success: true,
            user: publicUser(user),
            token: signToken(user),
        });
    } catch (error) {
        console.error("loginUser failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Could not sign in",
        });
    }
};

export const getCurrentUser = async (req, res) =>
    res.status(200).json({
        success: true,
        user: publicUser(req.user),
    });
