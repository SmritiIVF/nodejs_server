const express = require("express");
const router = express.Router();
const {
  createSlots,
  getAvailableSlots,
  getAllSlots,
  deleteSlot,
} = require("../controllers/slotController");
const { requireAuth } = require("../middleware/auth.middleware");

// ── Public Routes ──────────────────────────────────────────────
// Get unbooked slots (with optional ?date=YYYY-MM-DD filter)
router.get("/available", getAvailableSlots);

// ── Admin Protected Routes ──────────────────────────────────────
// Get ALL slots (including booked), with optional ?date= filter
router.get("/", requireAuth, getAllSlots);

// Bulk-create slots for a date
// Body: { date: "YYYY-MM-DD", slots: [{ startTime: "09:00", endTime: "09:30" }] }
// router.post("/", requireAuth, createSlots);
router.post("/", createSlots);

// Delete a slot (only allowed if not booked)
router.delete("/:id", requireAuth, deleteSlot);

module.exports = router;
