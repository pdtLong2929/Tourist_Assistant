require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(cookieParser());
app.use(express.json());

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));

app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 5036;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});