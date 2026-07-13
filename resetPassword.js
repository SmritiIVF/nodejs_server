/**
 * Create or reset admin user.
 * Usage: node resetPassword.js
 */

const crypto = require("crypto");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

// ── CONFIG ───────────────────────────────────────────────────────────────
const TARGET_EMAIL = "admin@example.com";
const NEW_PASSWORD = "Admin@123";
const USER_NAME = "Admin";
const USER_ROLE = "admin"; // Change if your app uses different roles
// ─────────────────────────────────────────────────────────────────────────

const PASSWORD_ITERATIONS = 100000;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_DIGEST = "sha512";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(
      password,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEY_LENGTH,
      PASSWORD_DIGEST
    )
    .toString("hex");

  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const users = mongoose.connection.collection("users");

  const existingUser = await users.findOne({
    email: TARGET_EMAIL.toLowerCase().trim(),
  });

  if (existingUser) {
    await users.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          password: hashPassword(NEW_PASSWORD),
        },
      }
    );

    console.log("✅ Existing user's password updated.");
  } else {
    await users.insertOne({
      name: USER_NAME,
      email: TARGET_EMAIL.toLowerCase().trim(),
      password: hashPassword(NEW_PASSWORD),
      role: USER_ROLE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ New user created.");
  }

  console.log("--------------------------------");
  console.log("Email:", TARGET_EMAIL);
  console.log("Password:", NEW_PASSWORD);
  console.log("--------------------------------");

  await mongoose.disconnect();
  console.log("✅ Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});