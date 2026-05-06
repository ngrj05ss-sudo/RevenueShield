require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { protect } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const anomalyRoutes = require('./routes/anomalyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Store io instance on app for use in controllers
app.set('io', io);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup - Using FileStore for reliable development persistence
// This avoids "EADDRINUSE" or "Connection Failed" errors with MongoDB session stores
app.use(session({
  store: new FileStore({
    path: './sessions',
    retries: 1,
    reapInterval: 3600
  }),
  secret: process.env.SESSION_SECRET || 'super-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Global user variable for templates
app.use((req, res, next) => {
  res.locals.user = req.session.userId ? { 
    email: req.session.email || 'user@example.com',
    role: req.session.role, 
    creatorId: req.session.creatorId 
  } : null;
  next();
});

// Routes
app.use('/auth', authRoutes);

// Protected API Routes
app.use('/api/revenue', protect, revenueRoutes);
app.use('/api/engagement', protect, engagementRoutes);
app.use('/api/distribute', protect, distributionRoutes);
app.use('/api/anomalies', protect, anomalyRoutes);
app.use('/api/creators', protect, creatorRoutes);
app.use('/api/youtube', protect, youtubeRoutes);

// Protected Dashboard Routes
app.use('/dashboard', protect, dashboardRoutes);

// Root redirect
app.get('/', (req, res) => {
  if (!req.session.userId) return res.render('index');
  res.redirect('/dashboard');
});

// Socket.io
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`\n🚀 RevenueShield Engine running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`📡 API Base: http://localhost:${PORT}/api\n`);
  });
};

startServer();

module.exports = app;
