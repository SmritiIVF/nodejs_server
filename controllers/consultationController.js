const Consultation = require("../models/Consultation");
const Slot = require("../models/Slot");
const { sendBookingConfirmation, sendVideoLinkEmail } = require("../utils/emailService");

/**
 * POST /api/consultation/
 * Public: Patient submits the initial form (name, mobile, email, description).
 * Returns consultationId which is used in the next step to book a slot.
 */
exports.createConsultation = async (req, res) => {
  try {
    const { name, mobile, email, description } = req.body;

    // Validate required fields
    if (!name || !mobile || !email || !description) {
      return res.status(400).json({
        success: false,
        message: "name, mobile, email, and description are required",
      });
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Mobile validation (10 digits)
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile.replace(/\s/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "Mobile must be a 10-digit number",
      });
    }

    const consultation = new Consultation({ name, mobile, email, description });
    await consultation.save();

    return res.status(201).json({
      success: true,
      message: "Consultation form submitted. Please select a slot.",
      data: {
        consultationId: consultation._id,
      },
    });
  } catch (error) {
    console.error("[consultationController] createConsultation error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/consultation/:id/book
 * Public: Patient selects a slot. Links slot to consultation and sends confirmation email.
 * Body: { slotId: "..." }
 */
exports.bookSlot = async (req, res) => {
  try {
    const { id } = req.params;
    const { slotId } = req.body;

    if (!slotId) {
      return res.status(400).json({ success: false, message: "slotId is required" });
    }

    // Find the consultation
    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    // Check if consultation already has a slot
    if (consultation.slotId) {
      return res.status(400).json({
        success: false,
        message: "A slot is already booked for this consultation",
      });
    }

    // Find and lock the slot atomically
    const slot = await Slot.findOneAndUpdate(
      { _id: slotId, isBooked: false },
      { isBooked: true, consultationId: id },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({
        success: false,
        message: "This slot is no longer available. Please choose another.",
      });
    }

    // Update consultation with the slot and set status to pending (awaiting admin confirmation)
    consultation.slotId = slot._id;
    consultation.status = "pending";
    await consultation.save();

    // Send confirmation email (non-blocking — errors don't fail the request)
    sendBookingConfirmation({
      toEmail: consultation.email,
      patientName: consultation.name,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }).catch((err) => console.error("[emailService] booking confirmation error:", err));

    return res.status(200).json({
      success: true,
      message: "Slot booked successfully. Confirmation email sent.",
      data: {
        consultationId: consultation._id,
        slot: {
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        },
        status: consultation.status,
      },
    });
  } catch (error) {
    console.error("[consultationController] bookSlot error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/consultation/
 * Admin: List all consultations with slot info.
 * Optional query: ?status=pending|confirmed|cancelled|completed&page=1&limit=20
 */
exports.listConsultations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [consultations, total] = await Promise.all([
      Consultation.find(query)
        .populate("slotId", "date startTime endTime")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Consultation.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: consultations,
    });
  } catch (error) {
    console.error("[consultationController] listConsultations error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/consultation/:id
 * Admin: Get a single consultation with full slot details.
 */
exports.getConsultationById = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id).populate(
      "slotId",
      "date startTime endTime isBooked"
    );

    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    return res.status(200).json({ success: true, data: consultation });
  } catch (error) {
    console.error("[consultationController] getConsultationById error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/consultation/:id/status
 * Admin: Update the status of a consultation.
 * Body: { status: "confirmed" | "cancelled" | "completed" }
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "confirmed", "cancelled", "completed"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const consultation = await Consultation.findById(req.params.id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    // If cancelling, free up the slot
    if (status === "cancelled" && consultation.slotId) {
      await Slot.findByIdAndUpdate(consultation.slotId, {
        isBooked: false,
        consultationId: null,
      });
    }

    consultation.status = status;
    await consultation.save();

    return res.status(200).json({
      success: true,
      message: `Consultation status updated to "${status}"`,
      data: consultation,
    });
  } catch (error) {
    console.error("[consultationController] updateStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * PUT /api/consultation/:id/video-link
 * Admin: Add a Google Meet link to the consultation and email the patient.
 * Body: { videoLink: "https://meet.google.com/...", meetingNotes?: "..." }
 */
exports.addVideoLink = async (req, res) => {
  try {
    const { videoLink, meetingNotes } = req.body;

    if (!videoLink) {
      return res.status(400).json({ success: false, message: "videoLink is required" });
    }

    // Basic URL validation
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(videoLink)) {
      return res.status(400).json({
        success: false,
        message: "videoLink must be a valid URL (https://meet.google.com/...)",
      });
    }

    const consultation = await Consultation.findById(req.params.id).populate(
      "slotId",
      "date startTime endTime"
    );

    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    consultation.videoLink = videoLink;
    if (meetingNotes) consultation.meetingNotes = meetingNotes;
    // Auto-confirm if still pending
    if (consultation.status === "pending") {
      consultation.status = "confirmed";
    }
    await consultation.save();

    // Send video link email to patient
    if (consultation.slotId) {
      sendVideoLinkEmail({
        toEmail: consultation.email,
        patientName: consultation.name,
        videoLink,
        date: consultation.slotId.date,
        startTime: consultation.slotId.startTime,
        endTime: consultation.slotId.endTime,
        meetingNotes: meetingNotes || null,
      }).catch((err) => console.error("[emailService] video link email error:", err));
    }

    return res.status(200).json({
      success: true,
      message: "Google Meet link added and patient notified via email.",
      data: {
        consultationId: consultation._id,
        videoLink: consultation.videoLink,
        status: consultation.status,
      },
    });
  } catch (error) {
    console.error("[consultationController] addVideoLink error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
