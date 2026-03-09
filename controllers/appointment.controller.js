const Appointment = require("../models/appointments.model");

exports.createAppointment = async (req, res) => {
  try {
    const { name, mobile, email, date, time, comment } = req.body;

    // Basic validation
    if (!name || !mobile || !email || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Optional: Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const newAppointment = new Appointment({
      name,
      mobile,
      email,
      date,
      time,
      comment,
    });

    await newAppointment.save();

    return res.status(201).json({
      success: true,
      message: "Appointment submitted successfully",
      data: newAppointment,
    });
  } catch (error) {
    console.error("Appointment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET: Dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    // Total count
    const total = await Appointment.countDocuments();

    // Today's range (server timezone)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Submissions created today
    const today = await Appointment.countDocuments({
      createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
    });

    // Latest 10 submissions
    const latest = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name mobile email date time comment createdAt");

    // Last 7 days chart counts (by createdAt)
    const last7Days = await Appointment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        today,
        latest,
        last7Days, // for charts
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};