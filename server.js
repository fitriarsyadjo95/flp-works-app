const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Serve static files
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.extname(filePath) === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.extname(filePath) === '.html') {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Routes for HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/signals', (req, res) => {
  res.sendFile(path.join(__dirname, 'signals.html'));
});

app.get('/education', (req, res) => {
  res.sendFile(path.join(__dirname, 'education.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, 'notifications.html'));
});

app.get('/saved-content', (req, res) => {
  res.sendFile(path.join(__dirname, 'saved-content.html'));
});

app.get('/referral-program', (req, res) => {
  res.sendFile(path.join(__dirname, 'referral-program.html'));
});

app.get('/trading-platforms', (req, res) => {
  res.sendFile(path.join(__dirname, 'trading-platforms.html'));
});

app.get('/premium-membership', (req, res) => {
  res.sendFile(path.join(__dirname, 'premium-membership.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'settings.html'));
});

app.get('/help-support', (req, res) => {
  res.sendFile(path.join(__dirname, 'help-support.html'));
});

// Catch-all handler for any other routes
app.get('*', (req, res) => {
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`FLP AcademyWorks server running on port ${PORT}`);
  console.log(`Access the app at: http://localhost:${PORT}`);
});