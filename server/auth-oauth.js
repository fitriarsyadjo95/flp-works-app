/**
 * OAuth Authentication Module
 * Handles Google and Apple OAuth authentication
 */

const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AppleStrategy = require('passport-apple');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const ContentManager = require('./content-manager');
const logger = require('./logger');

const router = express.Router();

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'flp-academyworks-secret-key-change-in-production';

/**
 * Configure Google OAuth Strategy
 */
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        logger.info('Google OAuth callback received', { profileId: profile.id });

        // Check if user exists
        let user = ContentManager.db.prepare('SELECT * FROM users WHERE email = ?').get(profile.emails[0].value);

        if (!user) {
            // Create new user
            const userId = uuidv4();
            const referralCode = `FLP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

            ContentManager.db.prepare(`
                INSERT INTO users (id, email, username, full_name, is_premium, referral_code, created_at, last_login)
                VALUES (?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
            `).run(
                userId,
                profile.emails[0].value,
                profile.displayName || profile.emails[0].value.split('@')[0],
                profile.displayName || '',
                referralCode
            );

            user = ContentManager.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            logger.info('New user created via Google OAuth', { userId });
        } else {
            // Update last login
            ContentManager.db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);
            logger.info('Existing user logged in via Google OAuth', { userId: user.id });
        }

        return done(null, user);
    } catch (error) {
        logger.error('Google OAuth error', { error: error.message });
        return done(error, null);
    }
}));

/**
 * Configure Apple OAuth Strategy
 */
passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID || 'YOUR_APPLE_CLIENT_ID',
    teamID: process.env.APPLE_TEAM_ID || 'YOUR_APPLE_TEAM_ID',
    callbackURL: process.env.APPLE_CALLBACK_URL || 'http://localhost:5001/auth/apple/callback',
    keyID: process.env.APPLE_KEY_ID || 'YOUR_APPLE_KEY_ID',
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH || './keys/AuthKey.p8'
}, async (accessToken, refreshToken, idToken, profile, done) => {
    try {
        logger.info('Apple OAuth callback received', { profileId: profile.id });

        const email = profile.email || `${profile.id}@privaterelay.appleid.com`;

        // Check if user exists
        let user = ContentManager.db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            // Create new user
            const userId = uuidv4();
            const referralCode = `FLP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
            const displayName = profile.name ? `${profile.name.firstName || ''} ${profile.name.lastName || ''}`.trim() : '';

            ContentManager.db.prepare(`
                INSERT INTO users (id, email, username, full_name, is_premium, referral_code, created_at, last_login)
                VALUES (?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))
            `).run(
                userId,
                email,
                displayName || email.split('@')[0],
                displayName,
                referralCode
            );

            user = ContentManager.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
            logger.info('New user created via Apple OAuth', { userId });
        } else {
            // Update last login
            ContentManager.db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);
            logger.info('Existing user logged in via Apple OAuth', { userId: user.id });
        }

        return done(null, user);
    } catch (error) {
        logger.error('Apple OAuth error', { error: error.message });
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = ContentManager.db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

/**
 * Google OAuth Routes
 */

// Initiate Google OAuth
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=google_auth_failed' }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = jwt.sign(
                {
                    id: req.user.id,
                    email: req.user.email,
                    username: req.user.username
                },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            // Redirect to success page with token
            res.redirect(`/auth-success.html?token=${token}&user=${encodeURIComponent(JSON.stringify({
                id: req.user.id,
                email: req.user.email,
                username: req.user.username,
                fullName: req.user.full_name,
                phone: req.user.phone,
                isPremium: req.user.is_premium
            }))}`);
        } catch (error) {
            logger.error('Google OAuth callback error', { error: error.message });
            res.redirect('/login.html?error=token_generation_failed');
        }
    }
);

/**
 * Apple OAuth Routes
 */

// Initiate Apple OAuth
router.post('/apple', passport.authenticate('apple'));

// Apple OAuth callback
router.post('/apple/callback',
    passport.authenticate('apple', { session: false, failureRedirect: '/login.html?error=apple_auth_failed' }),
    (req, res) => {
        try {
            // Generate JWT token
            const token = jwt.sign(
                {
                    id: req.user.id,
                    email: req.user.email,
                    username: req.user.username
                },
                JWT_SECRET,
                { expiresIn: '30d' }
            );

            // Redirect to success page with token
            res.redirect(`/auth-success.html?token=${token}&user=${encodeURIComponent(JSON.stringify({
                id: req.user.id,
                email: req.user.email,
                username: req.user.username,
                fullName: req.user.full_name,
                phone: req.user.phone,
                isPremium: req.user.is_premium
            }))}`);
        } catch (error) {
            logger.error('Apple OAuth callback error', { error: error.message });
            res.redirect('/login.html?error=token_generation_failed');
        }
    }
);

module.exports = { router, passport };
