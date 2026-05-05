const axios = require("axios");
const Lead = require("../models/lead.models");

function normalizePhone(phone) {
  return String(phone).replace(/\s+/g, "").trim();
}

function buildNeoDovePayload({ name, mobile, city_name }) {
  return {
    name,
    mobile: normalizePhone(mobile),
    email: "",
    city_name: city_name || "",
  };
}

async function createLead(req, res) {
  try {
    const { name, mobile, city_name, source } = req.body;

    // 1) Validate
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!mobile) return res.status(400).json({ error: "mobile is required" });

    const normalizedMobile = normalizePhone(mobile);

    // 2) Always create a new lead (duplicates allowed)
    const lead = await Lead.create({
      name: name.trim(),
      mobile: normalizedMobile,
      city_name: city_name || null,
      source: source || "website",
      "neodove.syncStatus": "pending",
    });

    // 3) Respond to frontend immediately
    res.status(200).json({
      leadId: lead._id.toString(),
      status: "created",
      message: "Lead created",
    });

    // 4) Push to NeoDove
    const endpoint = process.env.NEODOVE_ENDPOINT;
    if (!endpoint) {
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            "neodove.syncStatus": "failed",
            "neodove.lastError": "NEODOVE_ENDPOINT_URL not set",
            "neodove.lastSyncAt": new Date(),
          },
        }
      );
      return;
    }

    const payload = buildNeoDovePayload({
      name,
      mobile: normalizedMobile,
      city_name,
    });

    try {
      const resp = await axios.post(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      });

      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            "neodove.syncStatus": "sent",
            "neodove.lastResponse": resp.data,
            "neodove.lastError": null,
            "neodove.lastSyncAt": new Date(),
          },
        }
      );
    } catch (e) {
      await Lead.updateOne(
        { _id: lead._id },
        {
          $set: {
            "neodove.syncStatus": "failed",
            "neodove.lastError": e?.response?.data
              ? JSON.stringify(e.response.data)
              : e.message,
            "neodove.lastResponse": e?.response?.data || null,
            "neodove.lastSyncAt": new Date(),
          },
        }
      );
    }
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

// GET: Dashboard data
async function getLeadDashboard(req, res) {
  try {
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    const skip = (page - 1) * limit;

    const totalLeads = await Lead.countDocuments();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const todayLeads = await Lead.countDocuments({
      createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
    }); 

    const statusAgg = await Lead.aggregate([
      { $group: { _id: "$neodove.syncStatus", count: { $sum: 1 } } },
    ]);

    const statusCounts = statusAgg.reduce((acc, item) => {
      acc[item._id || "unknown"] = item.count;
      return acc;
    }, {});

    const latestLeads = await Lead.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name mobile city_name source neodove.syncStatus createdAt");

    const totalPages = Math.max(1, Math.ceil(totalLeads / limit));

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        todayLeads,
        statusCounts,
        latestLeads,
        currentPage: page,
        totalPages,
        limit,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      details: err.message,
    });
  }
}

module.exports = { createLead
  , getLeadDashboard };