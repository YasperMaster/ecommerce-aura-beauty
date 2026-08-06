import mongoose from "mongoose";

/**
 * Holds registration data for users who have NOT yet confirmed their email.
 * A real User document is only created once the 6-digit code is verified
 * (see authControllers.verifyEmail). Documents here expire automatically
 * via the TTL index on `expiresAt` — MongoDB reaps them in the background,
 * so abandoned signups never pile up.
 */
const PendingUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    password: {
      type: String,
      required: true, // already bcrypt-hashed before saving
    },
    codeHash: {
      type: String,
      required: true, // sha256 of the 6-digit code — never store the code itself
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index: MongoDB automatically deletes the document once expiresAt passes.
PendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PendingUser", PendingUserSchema);
