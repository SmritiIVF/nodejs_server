const express = require("express");
const router = express.Router();
const {
  createConsultation,
  bookSlot,
  listConsultations,
  getConsultationById,
  updateStatus,
  addVideoLink,
} = require("../controllers/consultationController");
const { requireAuth } = require("../middleware/auth.middleware");

// ── Public Routes ──────────────────────────────────────────────
// Step 1: Patient submits form
router.post("/", createConsultation);

// Step 2: Patient books a slot (after seeing available slots)
router.post("/:id/book", bookSlot);

// ── Admin Protected Routes ──────────────────────────────────────
// List all consultations (with optional ?status= and ?page= filters)
router.get("/", requireAuth, listConsultations);

// Get single consultation details
router.get("/:id", requireAuth, getConsultationById);

// Update consultation status (confirmed / cancelled / completed)
router.put("/:id/status", requireAuth, updateStatus);

// Add Google Meet link → triggers email to patient
router.put("/:id/video-link", requireAuth, addVideoLink);

module.exports = router;
