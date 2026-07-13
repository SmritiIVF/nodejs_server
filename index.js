const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/dbConnection.js');
const cookieParser = require('cookie-parser');
const leadRoutes = require('./routers/lead.routes.js');
const authRoutes = require('./routers/auth.routes.js');
const consultationRoutes = require('./routers/consultation.routes.js');
const slotRoutes = require('./routers/slot.routes.js');
const seedAdminUser = require('./utils/seedAdmin.js');
dotenv.config();


const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",   // your current frontend
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://smritiivf.com", // add production frontend here
      "https://smriti-admin-dashboard.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/lead',leadRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/slots', slotRoutes);

app.listen(PORT, async () => {
  await connectDB();
  await seedAdminUser();
  console.log(`Server is running on port ${PORT}`);
});
