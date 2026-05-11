const crypto = require("crypto");
const mongoose = require("mongoose");

const PASSWORD_ITERATIONS = 100000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!password || !storedPassword) return false;

  const [iterations, salt, originalHash] = storedPassword.split(":");
  if (!iterations || !salt || !originalHash) return false;

  const hash = crypto
    .pbkdf2Sync(password, salt, Number(iterations), PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const originalHashBuffer = Buffer.from(originalHash, "hex");

  return (
    hashBuffer.length === originalHashBuffer.length &&
    crypto.timingSafeEqual(hashBuffer, originalHashBuffer)
  );
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return verifyPassword(password, this.password);
};

userSchema.statics.hashPassword = hashPassword;

module.exports = mongoose.model("User", userSchema);
