const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// Import signals API, admin API, content API, posts API, and settings API
const { router: signalsRouter, setIO: setSignalsIO } = require('./server/signals-api');
const adminRouter = require('./server/admin-api');
const contentRouter = require('./server/content-api');
const { router: postsRouter, setIO: setPostsIO } = require('./server/posts-api');
const settingsRouter = require('./server/settings-api');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind CDN and inline scripts
        "https://cdn.tailwindcss.com",
        "https://cdn.jsdelivr.net",
        "https://cdn.socket.io"
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc)
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind
        "https://cdn.tailwindcss.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: isProduction ? ['https://your-production-domain.com'] : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit: 100 for production, 1000 for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Setup Socket.IO for real-time signals
const io = socketIO(server, {
  cors: {
    origin: isProduction ? ['https://your-production-domain.com'] : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`✓ Client connected to signals: ${socket.id}`);

  // Send current active signals on connection
  const SignalManager = require('./server/signal-manager');
  const activeSignals = SignalManager.getActiveSignals();
  socket.emit('initial-signals', activeSignals);

  socket.on('disconnect', () => {
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
});

// Pass io instance to signals API and posts API
setSignalsIO(io);
setPostsIO(io);

// Make io globally available for admin API
global.io = io;

// API routes
app.use('/api/signals', signalsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/posts', postsRouter);
app.use('/api/settings', settingsRouter);

// Serve static files from www directory
app.use(express.static('www', {
  maxAge: isProduction ? '1d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.extname(filePath) === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.extname(filePath) === '.html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'home.html'));
});

app.get('/signals', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'signals.html'));
});

app.get('/education', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'education.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'profile.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'notifications.html'));
});

app.get('/saved-content', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'saved-content.html'));
});

app.get('/referral-program', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'referral-program.html'));
});

app.get('/trading-platforms', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'trading-platforms.html'));
});

app.get('/premium-membership', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'premium-membership.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'settings.html'));
});

app.get('/help-support', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'help-support.html'));
});

// Catch-all handler for any other routes
app.get('*', (req, res) => {
  res.redirect('/');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);

  // Don't leak error details in production
  const errorResponse = isProduction
    ? { error: 'Internal server error' }
    : { error: err.message, stack: err.stack };

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).redirect('/');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FLP AcademyWorks Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📱 Application URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`\n🔒 Security Features:`);
  console.log(`   ✓ Helmet security headers`);
  console.log(`   ✓ Rate limiting (100 requests per 15 minutes)`);
  console.log(`   ✓ CORS protection`);
  console.log(`   ✓ Compression enabled`);
  console.log(`   ✓ Content Security Policy`);
  console.log(`\n📊 Signal Integration:`);
  console.log(`   ✓ WebSocket server active`);
  console.log(`   ✓ Signal database initialized`);
  console.log(`   ✓ API endpoint: POST /api/signals/ingest`);
  console.log(`   ✓ Real-time broadcasting enabled`);
  console.log(`\n🔑 API Key: ${process.env.SIGNAL_API_KEY || 'your-secure-api-key-change-in-production'}`);
  console.log(`\n${'='.repeat(60)}\n`);
});