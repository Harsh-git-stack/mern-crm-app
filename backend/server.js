// 1. Initialize dotenv at the VERY TOP
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// --- Create the Express App ---
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// --- Database Connection ---
const mongoURI = process.env.MONGO_URI;

// Check if the MONGO_URI is loaded correctly
if (!mongoURI) {
  console.error('FATAL ERROR: MONGO_URI is not defined in .env file');
  process.exit(1); // Exit the application with a failure code
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in .env file');
  process.exit(1);
}

if (process.env.ADMIN_SETUP_KEY && process.env.ADMIN_SETUP_KEY.length < 32) {
  console.error('FATAL ERROR: ADMIN_SETUP_KEY must contain at least 32 characters');
  process.exit(1);
}

// --- Define Routes ---
app.get('/', (req, res) => res.send('API is running...'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/leads', require('./routes/leadRoutes'));
app.use('/api/opportunities', require('./routes/opportunityRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/files', require('./routes/fileRoutes')); 
app.use('/api/activities', require('./routes/activityRoutes'));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ msg: 'Request body must be valid JSON' });
  }
  if (err.type === 'entity.too.large' || (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE')) {
    return res.status(413).json({ msg: 'Request payload exceeds the allowed size' });
  }

  console.error('Unhandled request error:', err.message);
  return res.status(500).json({ msg: 'Server Error' });
});



const startServer = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Check MONGO_URI, the database credentials, and the Atlas network access allowlist.');
    process.exit(1);
  }
};

startServer();

