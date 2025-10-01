/**
 * Admin Authentication Module
 * Handles admin login, session management, and role-based access control
 */

const crypto = require('crypto');

class AdminAuth {
    constructor() {
        // In production, store this in environment variables or secure database
        // For now, using hardcoded credentials with bcrypt-style hash
        this.admins = new Map([
            ['admin', {
                username: 'admin',
                // Password: 'FLP@dmin2025' - In production, use bcrypt
                passwordHash: this.hashPassword('FLP@dmin2025'),
                role: 'super_admin',
                email: 'admin@flpacademyworks.com',
                createdAt: new Date().toISOString()
            }]
        ]);

        // Active sessions storage (in production, use Redis or database)
        this.sessions = new Map();

        // Session duration: 8 hours
        this.SESSION_DURATION = 8 * 60 * 60 * 1000;

        console.log('✓ Admin authentication system initialized');
    }

    /**
     * Hash password using SHA-256 (in production, use bcrypt)
     */
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    /**
     * Generate secure session token
     */
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Authenticate admin credentials
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @returns {Object|null} Session object or null if authentication fails
     */
    login(username, password) {
        const admin = this.admins.get(username);

        if (!admin) {
            console.log(`✗ Login failed: Unknown username "${username}"`);
            return null;
        }

        const passwordHash = this.hashPassword(password);

        if (passwordHash !== admin.passwordHash) {
            console.log(`✗ Login failed: Invalid password for "${username}"`);
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
            ipAddress: null // Will be set by the route handler
        };

        this.sessions.set(sessionToken, session);

        console.log(`✓ Admin "${username}" logged in successfully`);

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
     * @returns {Object|null} Session data or null if invalid
     */
    validateSession(token) {
        const session = this.sessions.get(token);

        if (!session) {
            return null;
        }

        // Check if session expired
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            console.log(`✗ Session expired for "${session.username}"`);
            return null;
        }

        return session;
    }

    /**
     * Logout admin
     * @param {string} token - Session token
     */
    logout(token) {
        const session = this.sessions.get(token);

        if (session) {
            console.log(`✓ Admin "${session.username}" logged out`);
            this.sessions.delete(token);
            return true;
        }

        return false;
    }

    /**
     * Middleware to protect admin routes
     */
    requireAuth() {
        return (req, res, next) => {
            const token = req.headers['authorization']?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'No authentication token provided'
                });
            }

            const session = this.validateSession(token);

            if (!session) {
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
    getActiveSessions() {
        const now = Date.now();
        const activeSessions = [];

        for (const [token, session] of this.sessions.entries()) {
            if (session.expiresAt > now) {
                activeSessions.push({
                    username: session.username,
                    role: session.role,
                    loginAt: session.loginAt,
                    expiresAt: new Date(session.expiresAt).toISOString(),
                    ipAddress: session.ipAddress
                });
            } else {
                // Clean up expired sessions
                this.sessions.delete(token);
            }
        }

        return activeSessions;
    }

    /**
     * Create new admin user (only super_admin can do this)
     * @param {Object} adminData - New admin data
     * @returns {Object} Created admin or error
     */
    createAdmin(adminData, creatorRole) {
        if (creatorRole !== 'super_admin') {
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

        const newAdmin = {
            username: adminData.username,
            passwordHash: this.hashPassword(adminData.password),
            role: adminData.role || 'admin',
            email: adminData.email,
            createdAt: new Date().toISOString()
        };

        this.admins.set(newAdmin.username, newAdmin);

        console.log(`✓ New admin created: "${newAdmin.username}" with role "${newAdmin.role}"`);

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
     */
    changePassword(username, oldPassword, newPassword) {
        const admin = this.admins.get(username);

        if (!admin) {
            return { success: false, error: 'Admin not found' };
        }

        const oldPasswordHash = this.hashPassword(oldPassword);

        if (oldPasswordHash !== admin.passwordHash) {
            return { success: false, error: 'Current password is incorrect' };
        }

        admin.passwordHash = this.hashPassword(newPassword);
        this.admins.set(username, admin);

        // Invalidate all sessions for this admin
        for (const [token, session] of this.sessions.entries()) {
            if (session.username === username) {
                this.sessions.delete(token);
            }
        }

        console.log(`✓ Password changed for admin "${username}"`);

        return { success: true, message: 'Password changed successfully. Please login again.' };
    }
}

// Export singleton instance
module.exports = new AdminAuth();
