 const express = require('express');
const router = express.Router();
const {createLead } = require('../controllers/lead.controller.js');
const {createAppointment,getDashboardData} = require('../controllers/appointment.controller.js');
const { getLeadDashboard } = require("../controllers/lead.controller.js");


router.post('/create-lead', createLead);
router.get('/lead-dashboard', getLeadDashboard);

// appointment routes
router.get('/appointment-data', getDashboardData);
router.post('/appointment', createAppointment);

module.exports = router;
