import mongoose from "mongoose";

const coldMailSchema = new mongoose.Schema(
  {
    mailId: {
      type: Number,
      required: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    body: {
      type: String,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Mail = mongoose.model("Mail", coldMailSchema);

export default Mail;