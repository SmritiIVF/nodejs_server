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
    const pageQuery = parseInt(req.query.page, 10);
    const limitQuery = parseInt(req.query.limit, 10);
    const hasPagination = Number.isInteger(pageQuery) || Number.isInteger(limitQuery);
    let page = Number.isInteger(pageQuery) && pageQuery > 0 ? pageQuery : 1;
    let limit = Number.isInteger(limitQuery) && limitQuery > 0 ? limitQuery : 10;
    const skip = hasPagination ? (page - 1) * limit : 0;

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

    let latestLeadsQuery = Lead.find()
      .sort({ createdAt: -1 })
      .select("name mobile city_name source neodove.syncStatus createdAt");

    if (hasPagination) {
      latestLeadsQuery = latestLeadsQuery.skip(skip).limit(limit);
    }

    const latestLeads = await latestLeadsQuery;
    const totalPages = hasPagination ? Math.max(1, Math.ceil(totalLeads / limit)) : 1;

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        todayLeads,
        statusCounts,
        latestLeads,
        currentPage: page,
        totalPages,
        limit: hasPagination ? limit : totalLeads,
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

module.exports = {
  createLead
  , getLeadDashboard
};
