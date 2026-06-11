const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const routes = require('../routes');
const { initSocket } = require('../socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middlewares
app.use(cors({
  origin: '*', // For development. Tighten in production.
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads if attachments are uploaded
// app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Register Routes
app.use('/api', routes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    message: 'An unexpected server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Fallback Route
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Connect to MongoDB & Start Server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/trucode';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    server.listen(PORT, () => {
      console.log(`TOPD Backend Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed. Server not started.', err);
  });
