require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối Database
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