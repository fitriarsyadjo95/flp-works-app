# FLP AcademyWorks

> Mobile-first trading education platform with real-time signals, courses, and community features.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

FLP AcademyWorks is a comprehensive trading education platform that provides:
- **Real-time Trading Signals** via WebSocket
- **Educational Content** with video courses and categories
- **Community Posts** for member interaction
- **Pro Membership System** with access control
- **Admin Panel** for content and user management
- **Mobile-First Design** built with iOS Capacitor

---

## ✨ Features

### For Users
- 📊 **Real-time Trading Signals** - Live forex signals with entry, stop-loss, and take-profit levels
- 🎓 **Educational Courses** - Video-based learning with progress tracking
- 💬 **Community Posts** - Share insights and interact with other traders
- ⭐ **Pro Membership** - Premium content access with membership tiers
- 🔔 **Notifications** - Stay updated with alerts and new content
- 📱 **Mobile App** - Native iOS app using Capacitor

### For Admins
- 👥 **User Management** - Manage memberships and user access
- 📝 **Content Management** - Create and organize courses, categories
- 📊 **Signal Management** - Monitor and manage trading signals
- 💬 **Post Moderation** - Manage community posts
- 📈 **Analytics** - View platform statistics and metrics
- ⚙️ **Settings** - Configure app settings and Telegram integration

---

## 🛠 Tech Stack

### Backend
- **Node.js** (v16+) - Server runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time WebSocket communication
- **better-sqlite3** - SQLite database
- **bcrypt** - Password hashing
- **Winston** - Structured logging

### Security
- **Helmet.js** - Security headers (CSP, HSTS, XSS protection)
- **Express Rate Limit** - API rate limiting
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

### Frontend
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework overhead
- **Socket.IO Client** - Real-time updates

### Mobile
- **Capacitor** - Cross-platform native runtime
- **iOS Support** - Native iOS app capabilities

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 16.0.0 ([Download](https://nodejs.org/))
- **npm** or **yarn** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Xcode** (for iOS development) ([Mac App Store](https://apps.apple.com/us/app/xcode/id497799835))

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/flp-works-app.git
cd flp-works-app
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express, Socket.IO, better-sqlite3
- Security packages (bcrypt, helmet, cors)
- Logging (winston, winston-daily-rotate-file)
- Development tools (jest, supertest, nodemon)

### 3. Generate Admin Password Hash

```bash
node scripts/generate-admin-hash.js
```

Follow the prompts to generate a secure password hash for the admin account.

---

## ⚙️ Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your configuration:

```bash
# Server Configuration
NODE_ENV=development
PORT=5001
PRODUCTION_DOMAIN=http://localhost:5001

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<hash-from-generator-script>
ADMIN_EMAIL=admin@yourdomain.com

# Security
SIGNAL_API_KEY=<generate-random-key>
SESSION_SECRET=<generate-random-secret>
SESSION_DURATION=28800000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=15
RATE_LIMIT_MAX_REQUESTS=1000
LOGIN_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# CORS
CORS_ORIGINS=http://localhost:5001,http://localhost:3000
```

### 3. Generate Secure Keys

Generate secure random keys for production:

```bash
# For SIGNAL_API_KEY and SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

Or:

```bash
node server.js
```

The server will start at [http://localhost:5001](http://localhost:5001)

### Production Mode

```bash
NODE_ENV=production npm start
```

### iOS App (Development)

```bash
# Sync web assets to iOS app
npx cap sync ios

# Open in Xcode
npx cap open ios
```

---

## 📚 API Documentation

### Authentication Endpoints

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}

Response:
{
  "success": true,
  "token": "session-token",
  "user": {
    "username": "admin",
    "role": "super_admin",
    "email": "admin@example.com"
  },
  "expiresAt": 1234567890
}
```

#### Validate Session
```http
GET /api/admin/validate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "admin": {
    "username": "admin",
    "role": "super_admin",
    "email": "admin@example.com"
  }
}
```

### Signal Endpoints

#### Ingest New Signal
```http
POST /api/signals/ingest
Authorization: Bearer <SIGNAL_API_KEY>
Content-Type: application/json

{
  "pair": "EUR/USD",
  "action": "BUY",
  "entry": 1.0850,
  "stopLoss": 1.0800,
  "takeProfit": 1.0950,
  "confidence": 85,
  "risk": 1.5,
  "reasoning": "Bullish trend continuation"
}

Response:
{
  "success": true,
  "signal": {
    "id": "uuid",
    "pair": "EUR/USD",
    "action": "BUY",
    ...
  }
}
```

#### Get Active Signals
```http
GET /api/signals/active

Response:
{
  "success": true,
  "signals": [...]
}
```

### Membership Endpoints

#### Check Membership
```http
GET /api/settings/membership/check
Authorization: User <user-id>

Response:
{
  "success": true,
  "isPro": false,
  "membershipTier": "free"
}
```

#### Update Membership (Admin)
```http
PUT /api/settings/membership/:userId
Content-Type: application/json

{
  "isPro": true
}

Response:
{
  "success": true,
  "message": "Membership updated to Pro"
}
```

For complete API documentation, see [API.md](docs/API.md)

---

## 🔒 Security

### Implemented Security Features

✅ **Authentication & Authorization**
- Bcrypt password hashing (cost factor: 12)
- Session-based authentication with secure tokens
- Role-based access control (RBAC)
- Environment variable credential storage

✅ **Security Headers**
- HSTS (Strict-Transport-Security) - 1 year max-age
- Content Security Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- XSS Protection enabled

✅ **Rate Limiting**
- Global rate limit: 100 req/15min (production)
- Login rate limit: 5 attempts/15min per IP
- Rate limit logging for security monitoring

✅ **Data Protection**
- SQL injection prevention (prepared statements)
- XSS protection via CSP
- CORS configuration
- Request body size limits (10mb)

✅ **Logging & Monitoring**
- Structured logging with Winston
- Security event logging
- Audit trail for admin actions
- Daily log rotation
- Separate error/HTTP/combined logs

### Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Rotate credentials regularly** - Use the password hash generator
3. **Use HTTPS in production** - Configure SSL/TLS certificates
4. **Enable Redis sessions** - For horizontal scaling
5. **Regular security audits** - Run `npm audit` weekly
6. **Keep dependencies updated** - Monitor for vulnerabilities

### Known Security Considerations

⚠️ **For Production Deployment:**
1. Migrate from in-memory sessions to Redis
2. Enable Sentry for error monitoring
3. Setup database backups
4. Use PostgreSQL instead of SQLite for high load
5. Implement JWT with refresh tokens
6. Add CSRF protection for forms
7. Setup monitoring dashboards

---

## 🚢 Deployment

### Environment Checklist

Before deploying to production, ensure:

- [ ] `NODE_ENV=production` is set
- [ ] Strong admin password hash configured
- [ ] Unique `SIGNAL_API_KEY` generated
- [ ] Unique `SESSION_SECRET` generated (32+ chars)
- [ ] `PRODUCTION_DOMAIN` is set correctly
- [ ] CORS origins configured for your domain
- [ ] Redis configured for session storage
- [ ] SSL/TLS certificates installed
- [ ] Database backups enabled
- [ ] Log aggregation service configured
- [ ] Error monitoring (Sentry) enabled

### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set ADMIN_PASSWORD_HASH=<your-hash>
railway variables set SIGNAL_API_KEY=<your-key>
# ... set all required variables

# Deploy
railway up
```

### Manual Deployment

1. **Server Setup**
   ```bash
   # Install Node.js 16+
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone and install
   git clone <your-repo>
   cd flp-works-app
   npm install --production
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

3. **Use Process Manager**
   ```bash
   # Install PM2
   npm install -g pm2

   # Start application
   pm2 start server.js --name flp-academy

   # Enable startup script
   pm2 startup
   pm2 save
   ```

4. **Setup Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # WebSocket support
       location /socket.io/ {
           proxy_pass http://localhost:5001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

5. **Setup SSL with Let's Encrypt**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 🐛 Troubleshooting

### Common Issues

#### Server won't start
```bash
# Check if port is already in use
lsof -i :5001

# Kill process if needed
kill -9 <PID>

# Check logs
tail -f logs/error-*.log
```

#### Database locked error
```bash
# Remove database lock files
rm -f *.db-shm *.db-wal

# Restart server
npm run dev
```

#### Admin login fails
```bash
# Regenerate password hash
node scripts/generate-admin-hash.js

# Update .env with new hash
# Restart server
```

#### WebSocket connection fails
- Check CORS settings in `.env`
- Verify firewall allows WebSocket connections
- Check browser console for CSP violations

#### Missing logs directory
```bash
# Create logs directory
mkdir -p logs

# Set proper permissions
chmod 755 logs
```

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug node server.js
```

---

## 📖 Project Structure

```
flp-works-app/
├── server/                   # Backend code
│   ├── admin-api.js         # Admin endpoints
│   ├── admin-auth.js        # Authentication logic
│   ├── signals-api.js       # Signal endpoints
│   ├── content-api.js       # Course endpoints
│   ├── posts-api.js         # Community posts
│   ├── settings-api.js      # User settings
│   ├── logger.js            # Winston logger
│   ├── signal-manager.js    # Signal database
│   ├── content-manager.js   # Content database
│   ├── post-manager.js      # Posts database
│   └── settings-manager.js  # Settings database
├── www/                      # Frontend files
│   ├── assets/              # CSS, JS, images
│   ├── index.html           # Landing page
│   ├── home.html            # User dashboard
│   ├── signals.html         # Trading signals
│   ├── education.html       # Courses
│   ├── admin-*.html         # Admin pages
│   └── ...
├── scripts/                  # Utility scripts
│   └── generate-admin-hash.js
├── logs/                     # Application logs
├── ios/                      # iOS app (Capacitor)
├── .env.example             # Environment template
├── .gitignore               # Git ignore rules
├── server.js                # Main server file
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- signal-manager.test.js

# Watch mode
npm run test:watch
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues and questions:
- **GitHub Issues**: [https://github.com/your-org/flp-works-app/issues](https://github.com/your-org/flp-works-app/issues)
- **Email**: support@flpacademyworks.com
- **Telegram**: @flpacademyworks

---

## 🙏 Acknowledgments

- Trading education community for feedback
- Open source contributors
- Beta testers

---

**Made with ❤️ by FLP AcademyWorks Team**
