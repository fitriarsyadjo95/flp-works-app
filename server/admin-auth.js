/**
 * Admin Authentication Module
 * Handles admin login, session management, and role-based access control
 *
 * SECURITY: Uses bcrypt for password hashing and environment variables for credentials
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('./logger');
const sessionStore = require('./session-store');
const auditLogger = require('./audit-logger');

// Load environment variables
require('dotenv').config();

const SALT_ROUNDS = 12; // Bcrypt cost factor (higher = more secure but slower)

class AdminAuth {
    constructor() {
        // Load admin credentials from environment variables
        const adminUsername = process.env.ADMIN_USERNAME;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@flpacademyworks.com';

        // Validate required environment variables
        if (!adminUsername) {
            logger.error('ADMIN_USERNAME environment variable is required');
            throw new Error('ADMIN_USERNAME environment variable is required');
        }

        if (!adminPasswordHash) {
            logger.error('ADMIN_PASSWORD_HASH environment variable is required');
            throw new Error('ADMIN_PASSWORD_HASH environment variable is required. Generate with: node scripts/generate-admin-hash.js');
        }

        // Initialize admin users
        this.admins = new Map([
            [adminUsername, {
                username: adminUsername,
                passwordHash: adminPasswordHash,
                role: 'super_admin',
                email: adminEmail,
                createdAt: new Date().toISOString()
            }]
        ]);

        // Session duration from environment or default to 8 hours
        this.SESSION_DURATION = parseInt(process.env.SESSION_DURATION) || 8 * 60 * 60 * 1000;

        logger.info('Admin authentication system initialized', {
            adminCount: this.admins.size,
            sessionDuration: `${this.SESSION_DURATION / 1000 / 60} minutes`
        });
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        try {
            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            return hash;
        } catch (error) {
            logger.error('Password hashing failed', { error: error.message });
            throw new Error('Password hashing failed');
        }
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Stored password hash
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            logger.error('Password verification failed', { error: error.message });
            return false;
        }
    }

    /**
     * Generate secure session token
     * @returns {string} Random secure token
     */
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Authenticate admin credentials
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {string} ipAddress - Client IP address
     * @returns {Promise<Object|null>} Session object or null if authentication fails
     */
    async login(username, password, ipAddress = 'unknown') {
        const admin = this.admins.get(username);

        if (!admin) {
            logger.security('Login attempt with unknown username', {
                username,
                ipAddress
            });
            auditLogger.logSecurityEvent({
                eventType: 'failed_login',
                username,
                ipAddress,
                description: 'Login attempt with unknown username',
                severity: 'medium'
            });
            // Return null after a delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return null;
        }

        // Verify password with bcrypt
        const isValid = await this.verifyPassword(password, admin.passwordHash);

        if (!isValid) {
            logger.security('Login failed - invalid password', {
                username,
                ipAddress
            });
            auditLogger.logSecurityEvent({
                eventType: 'failed_login',
                username,
                ipAddress,
                description: 'Invalid password',
                severity: 'high'
            });
            // Return null after a delay to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 1000));
            return null;
        }

        // Create session
        const sessionToken = this.generateSessionToken();
        const session = {
            token: sessionToken,
            username: admin.username,
            role: admin.role,
            email: admin.email,
            loginAt: new Date().toISOString(),
            expiresAt: Date.now() + this.SESSION_DURATION,
            ipAddress
        };

        // Store session in Redis/memory
        await sessionStore.set(sessionToken, session, this.SESSION_DURATION);

        logger.audit('Admin login successful', {
            username: admin.username,
            ipAddress,
            sessionExpires: new Date(session.expiresAt).toISOString()
        });

        auditLogger.log({
            eventType: 'authentication',
            action: 'admin_login',
            username: admin.username,
            ipAddress,
            result: 'success',
            metadata: { role: admin.role, sessionExpires: new Date(session.expiresAt).toISOString() }
        });

        return {
            success: true,
            token: sessionToken,
            user: {
                username: admin.username,
                role: admin.role,
                email: admin.email
            },
            expiresAt: session.expiresAt
        };
    }

    /**
     * Validate session token
     * @param {string} token - Session token
     * @returns {Promise<Object|null>} Session data or null if invalid
     */
    async validateSession(token) {
        const session = await sessionStore.get(token);

        if (!session) {
            return null;
        }

        // Check if session expired
        if (Date.now() > session.expiresAt) {
            await sessionStore.delete(token);
            logger.info('Session expired', { username: session.username });
            return null;
        }

        return session;
    }

    /**
     * Logout admin
     * @param {string} token - Session token
     */
    async logout(token) {
        const session = await sessionStore.get(token);

        if (session) {
            logger.audit('Admin logout', { username: session.username });

            auditLogger.log({
                eventType: 'authentication',
                action: 'admin_logout',
                username: session.username,
                ipAddress: session.ipAddress,
                result: 'success'
            });

            await sessionStore.delete(token);
            return true;
        }

        return false;
    }

    /**
     * Middleware to protect admin routes
     */
    requireAuth() {
        return async (req, res, next) => {
            const token = req.headers['authorization']?.replace('Bearer ', '');

            if (!token) {
                logger.security('Unauthorized access attempt - no token', {
                    url: req.originalUrl,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'No authentication token provided'
                });
            }

            const session = await this.validateSession(token);

            if (!session) {
                logger.security('Unauthorized access attempt - invalid token', {
                    url: req.originalUrl,
                    ip: req.ip
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid or expired session',
                    message: 'Please login again'
                });
            }

            // Attach session to request
            req.admin = session;
            next();
        };
    }

    /**
     * Middleware to check specific role
     */
    requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!allowedRoles.includes(req.admin.role)) {
                logger.security('Insufficient permissions', {
                    username: req.admin.username,
                    role: req.admin.role,
                    requiredRoles: allowedRoles,
                    url: req.originalUrl
                });
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    message: `This action requires one of these roles: ${allowedRoles.join(', ')}`
                });
            }

            next();
        };
    }

    /**
     * Get all active sessions (for admin panel)
     */
    async getActiveSessions() {
        // Delegate to session store
        const count = await sessionStore.getSessionCount();
        return {
            count,
            message: 'Use session store directly for detailed session information'
        };
    }

    /**
     * Create new admin user (only super_admin can do this)
     * @param {Object} adminData - New admin data
     * @param {string} creatorRole - Role of admin creating the account
     * @returns {Promise<Object>} Created admin or error
     */
    async createAdmin(adminData, creatorRole) {
        if (creatorRole !== 'super_admin') {
            logger.security('Attempt to create admin without permission', { creatorRole });
            return {
                success: false,
                error: 'Only super administrators can create admin accounts'
            };
        }

        if (this.admins.has(adminData.username)) {
            return {
                success: false,
                error: 'Username already exists'
            };
        }

        // Validate password strength
        if (!adminData.password || adminData.password.length < 12) {
            return {
                success: false,
                error: 'Password must be at least 12 characters long'
            };
        }

        const passwordHash = await this.hashPassword(adminData.password);

        const newAdmin = {
            username: adminData.username,
            passwordHash,
            role: adminData.role || 'admin',
            email: adminData.email,
            createdAt: new Date().toISOString()
        };

        this.admins.set(newAdmin.username, newAdmin);

        logger.audit('New admin created', {
            username: newAdmin.username,
            role: newAdmin.role,
            createdBy: creatorRole
        });

        return {
            success: true,
            admin: {
                username: newAdmin.username,
                role: newAdmin.role,
                email: newAdmin.email,
                createdAt: newAdmin.createdAt
            }
        };
    }

    /**
     * Change admin password
     * @param {string} username - Admin username
     * @param {string} oldPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Success status
     */
    async changePassword(username, oldPassword, newPassword) {
        const admin = this.admins.get(username);

        if (!admin) {
            return { success: false, error: 'Admin not found' };
        }

        // Verify old password
        const isValid = await this.verifyPassword(oldPassword, admin.passwordHash);

        if (!isValid) {
            logger.security('Password change failed - incorrect old password', { username });
            return { success: false, error: 'Current password is incorrect' };
        }

        // Validate new password strength
        if (newPassword.length < 12) {
            return { success: false, error: 'New password must be at least 12 characters long' };
        }

        // Hash new password
        admin.passwordHash = await this.hashPassword(newPassword);
        this.admins.set(username, admin);

        // Invalidate all sessions for this admin
        await sessionStore.deleteByUsername(username);

        logger.audit('Password changed', { username });

        return { success: true, message: 'Password changed successfully. Please login again.' };
    }

    /**
     * Clean up expired sessions (run periodically)
     */
    async cleanupExpiredSessions() {
        // Delegate to session store
        return await sessionStore.cleanupExpired();
    }
}

// Export singleton instance
const adminAuth = new AdminAuth();

// Cleanup expired sessions every 15 minutes
setInterval(() => {
    adminAuth.cleanupExpiredSessions();
}, 15 * 60 * 1000);

module.exports = adminAuth;
