const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/dbConnection.js');
const cookieParser = require('cookie-parser');
const leadRoutes = require('./routers/lead.routes.js');
dotenv.config();

const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:3001",   // your current frontend
      "https://smritiivf.com", // add production frontend here
      "https://smriti-admin-dashboard.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use('/api/lead',leadRoutes);

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});