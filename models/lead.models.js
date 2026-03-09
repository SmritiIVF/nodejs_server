const mongoose = require("mongoose");

const LeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    city_name: {
      type: String,
      trim: true,
      default: null,
    },

    source: {
      type: String,
      default: "website",
      trim: true,
    },

    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "lost"],
      default: "new",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // NeoDove sync tracking
    neodove: {
      syncStatus: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
      },
      lastSyncAt: {
        type: Date,
        default: null,
      },
      lastResponse: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      lastError: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", LeadSchema);