import mongoose from "mongoose";

/**
 * Holds an in-progress "forgot password" request. Kept in its own
 * collection (same pattern as PendingUserModel) rather than fields on
 * UserModel, so it can expire independently via a TTL index and doesn't
 * clutter the user schema with reset-flow state.
 */
const PasswordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
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
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("PasswordReset", PasswordResetSchema);
