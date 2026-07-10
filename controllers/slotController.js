const Slot = require("../models/Slot");

/**
 * POST /api/slots/
 * Admin: Create one or multiple slots for a given date.
 * Body: { date: "YYYY-MM-DD", slots: [{ startTime: "HH:MM", endTime: "HH:MM" }] }
 */
exports.createSlots = async (req, res) => {
  try {
    const { date, slots } = req.body;

    if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "date and slots array are required",
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "date must be in YYYY-MM-DD format",
      });
    }

    // Validate each slot object
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        return res.status(400).json({
          success: false,
          message: "Each slot must have startTime and endTime",
        });
      }
    }

    // Build slot documents
    const slotDocs = slots.map((s) => ({
      date,
      startTime: s.startTime,
      endTime: s.endTime,
      isBooked: false,
      consultationId: null,
    }));

    // insertMany with ordered: false so partial success is allowed
    const inserted = await Slot.insertMany(slotDocs, { ordered: false }).catch(
      (err) => {
        // Handle duplicate key errors gracefully
        if (err.code === 11000 || err.writeErrors) {
          return err.insertedDocs || [];
        }
        throw err;
      }
    );

    return res.status(201).json({
      success: true,
      message: `${inserted.length} slot(s) created successfully`,
      data: inserted,
    });
  } catch (error) {
    console.error("[slotController] createSlots error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/slots/available
 * Public: Get all unbooked slots. Optional query: ?date=YYYY-MM-DD
 */
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;

    const query = { isBooked: false };

    if (date) {
      // Filter by specific date
      query.date = date;
    } else {
      // Only return today and future slots
      const today = new Date().toISOString().split("T")[0];
      query.date = { $gte: today };
    }

    const slots = await Slot.find(query).sort({ date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    console.error("[slotController] getAvailableSlots error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/slots/
 * Admin: Get all slots (including booked), with optional date filter.
 */
exports.getAllSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const query = {};
    if (date) query.date = date;

    const slots = await Slot.find(query)
      .populate("consultationId", "name mobile email status")
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    console.error("[slotController] getAllSlots error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * DELETE /api/slots/:id
 * Admin: Delete a slot (only if not booked).
 */
exports.deleteSlot = async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({ success: false, message: "Slot not found" });
    }

    if (slot.isBooked) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete a booked slot. Cancel the consultation first.",
      });
    }

    await Slot.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Slot deleted successfully",
    });
  } catch (error) {
    console.error("[slotController] deleteSlot error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
