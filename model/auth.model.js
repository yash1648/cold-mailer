import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        domain: {
            type: String,
            trim: true,
        },
        skills: {
            type: [{ type: String, trim: true }],
            default: [],
        },
        files: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "File",
            },
        ],
        mails: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Mail",
            },
        ],
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
