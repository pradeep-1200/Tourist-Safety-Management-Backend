require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time alerts
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach io to app so controllers can use it
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB Atlas
connectDB();

// CORS Configuration - Allow all origins
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/locations', require('./src/routes/locations'));
app.use('/api/alerts', require('./src/routes/alerts'));
app.use('/api/tourists', require('./src/routes/tourists'));
app.use('/api/danger-zones', require('./src/routes/dangerZones'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Smart Tourist Safety API is Live!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login',
      register: '/api/auth/register',
      docs: '/api/docs'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Smart Tourist Safety API',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    service: 'Smart Tourist Safety API',
    version: '1.0.0',
    description: 'Backend API for Smart Tourist Safety Monitoring System',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new tourist',
        'POST /api/auth/login': 'Login with email and password',
        'GET /api/auth/profile': 'Get tourist profile (JWT required)'
      },
      locations: {
        'POST /api/locations/update': 'Update tourist location (JWT required)'
      },
      alerts: {
        'POST /api/alerts/panic': 'Create panic alert (JWT required)',
        'GET /api/alerts': 'Get all alerts (for dashboard)',
        'GET /api/alerts/user/:id': 'Get alerts for a tourist (JWT required)'
      },
      tourists: {
        'GET /api/tourists': 'Get all tourists (for dashboard)'
      },
      dangerZones: {
        'GET /api/danger-zones': 'Get all danger zones',
        'POST /api/danger-zones': 'Create a new danger zone',
        'PUT /api/danger-zones/:id': 'Update a danger zone',
        'DELETE /api/danger-zones/:id': 'Deactivate a danger zone'
      },
      system: {
        'GET /api/health': 'Health check',
        'GET /api/docs': 'API documentation'
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong!'
      : err.message,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Smart Tourist Safety API is running on port ${PORT}!`);
  console.log(`📡 Socket.IO enabled for real-time alerts`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
