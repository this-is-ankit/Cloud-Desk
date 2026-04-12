import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      default: "student",
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2400,
      default: "",
    },
    subjects: {
      type: [String],
      default: [],
    },
    languagesSpoken: {
      type: [String],
      default: [],
    },
    availabilityNote: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    profileVisible: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }, // createdAt, updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;
