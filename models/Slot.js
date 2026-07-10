const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    date: {
      type: String, // format: "YYYY-MM-DD"
      required: true,
    },
    startTime: {
      type: String, // format: "HH:MM" (24h)
      required: true,
    },
    endTime: {
      type: String, // format: "HH:MM" (24h)
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate slots on the same date+time
slotSchema.index({ date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema);
