// Load environment variables first
require('dotenv').config();

// Initialize Sentry first (before other imports)
const sentry = require('./server/sentry');
sentry.init();

// Add crash detection handlers IMMEDIATELY after Sentry
process.on('exit', (code) => {
  console.error(`[CRASH DETECTION] Process exiting with code: ${code}`);
  console.error(`[CRASH DETECTION] Stack trace:`, new Error().stack);
});

process.on('uncaughtException', (error) => {
  console.error('[CRASH DETECTION] Uncaught exception:', error);
  console.error('[CRASH DETECTION] Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH DETECTION] Unhandled rejection at:', promise);
  console.error('[CRASH DETECTION] Reason:', reason);
  process.exit(1);
});

console.log('[DEBUG] Crash handlers installed');

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const socketIO = require('socket.io');
const logger = require('./server/logger');
const csrfProtection = require('./server/csrf-protection');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5001;
const isProduction = process.env.NODE_ENV === 'production';

// Log startup
logger.info('Starting FLP AcademyWorks Server', {
    environment: isProduction ? 'production' : 'development',
    port: PORT,
    nodeVersion: process.version
});

// Import signals API, admin API, content API, posts API, settings API, referrals API, and OAuth
const { router: signalsRouter, setIO: setSignalsIO } = require('./server/signals-api');
const adminRouter = require('./server/admin-api');
const contentRouter = require('./server/content-api');
const { router: postsRouter, setIO: setPostsIO } = require('./server/posts-api');
const settingsRouter = require('./server/settings-api');
const referralsRouter = require('./server/referrals-api');
const { router: authRouter, passport } = require('./server/auth-oauth');

console.log('[DEBUG] All modules loaded successfully');
console.log('[DEBUG] About to configure middleware...');

// Sentry request handler (must be first middleware)
app.use(sentry.requestHandler());
app.use(sentry.tracingHandler());

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
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

logger.info('Security headers configured', {
  csp: 'enabled',
  hsts: 'enabled',
  xssProtection: 'enabled'
});

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : (isProduction ? [process.env.PRODUCTION_DOMAIN] : '*');

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  credentials: true
}));

logger.info('CORS configured', { origins: corsOrigins });

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later'
    });
  }
});

app.use(limiter);

logger.info('Rate limiting configured', {
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15,
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000)
});

// Compression middleware
app.use(compression());

// Initialize Passport
app.use(passport.initialize());

// HTTP request logging
app.use(logger.httpMiddleware);

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
  logger.info('WebSocket client connected', { socketId: socket.id });

  // Send current active signals on connection
  const SignalManager = require('./server/signal-manager');
  const activeSignals = SignalManager.getActiveSignals();
  socket.emit('initial-signals', activeSignals);

  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id });
  });

  socket.on('error', (error) => {
    logger.error('WebSocket error', { socketId: socket.id, error: error.message });
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
app.use('/api/referrals', referralsRouter);

// OAuth routes
app.use('/auth', authRouter);

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

// Sentry error handler (must be before custom error handlers)
app.use(sentry.errorHandler());

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const errorResponse = isProduction
    ? { error: 'Internal server error', requestId: req.id }
    : { error: err.message, stack: err.stack };

  res.status(err.status || 500).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).redirect('/');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  sentry.captureException(error, { context: 'uncaughtException' });
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  sentry.captureException(reason, { context: 'unhandledRejection', promise });
  logger.error('Unhandled Promise Rejection', {
    reason: reason,
    promise: promise
  });
});

server.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: isProduction ? 'production' : 'development',
    url: `http://localhost:${PORT}`
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`FLP AcademyWorks Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n📱 Application URL: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`\n🔒 Security Features:`);
  console.log(`   ✓ Helmet security headers + HSTS`);
  console.log(`   ✓ Rate limiting configured`);
  console.log(`   ✓ CORS protection`);
  console.log(`   ✓ Bcrypt password hashing`);
  console.log(`   ✓ Structured logging (Winston)`);
  console.log(`\n📊 Signal Integration:`);
  console.log(`   ✓ WebSocket server active`);
  console.log(`   ✓ Signal database initialized`);
  console.log(`   ✓ API endpoint: POST /api/signals/ingest`);
  console.log(`   ✓ Real-time broadcasting enabled`);
  console.log(`\n📝 Logs: ${process.env.LOG_DIR || './logs'}`);
  console.log(`\n${'='.repeat(60)}\n`);
});