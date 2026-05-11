const User = require("../models/user.model");

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    if (process.env.ADMIN_RESET_PASSWORD === "true") {
      existingUser.password = User.hashPassword(password);
      existingUser.name = process.env.ADMIN_NAME || existingUser.name;
      await existingUser.save();
      console.log("Admin password reset from environment variables");
    }

    return;
  }

  await User.create({
    name: process.env.ADMIN_NAME || "Admin",
    email: normalizedEmail,
    password: User.hashPassword(password),
    role: "admin",
  });

  console.log("Admin user created from environment variables");
}

module.exports = seedAdminUser;
