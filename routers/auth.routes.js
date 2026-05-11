const express = require("express");
const { login, changePassword } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/login", login);
router.put("/change-password", requireAuth, changePassword);

module.exports = router;
