/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 *
 * Usage:
 * - Apply to state-changing admin routes (POST, PUT, PATCH, DELETE)
 * - Skip for API endpoints that use token-based authentication
 */

const crypto = require('crypto');
const logger = require('./logger');

class CSRFProtection {
    constructor() {
        // Store CSRF tokens in memory (can be moved to Redis for production)
        this.tokens = new Map();

        // CSRF token expiration (1 hour)
        this.TOKEN_EXPIRATION = 60 * 60 * 1000;

        // Cleanup expired tokens every 15 minutes
        setInterval(() => {
            this.cleanupExpiredTokens();
        }, 15 * 60 * 1000);

        logger.info('CSRF protection initialized');
    }

    /**
     * Generate CSRF token for session
     * @param {string} sessionToken - User session token
     * @returns {string} CSRF token
     */
    generateToken(sessionToken) {
        const csrfToken = crypto.randomBytes(32).toString('hex');

        this.tokens.set(csrfToken, {
            sessionToken,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.TOKEN_EXPIRATION
        });

        logger.debug('CSRF token generated', {
            csrfToken: csrfToken.substring(0, 8),
            sessionToken: sessionToken.substring(0, 8)
        });

        return csrfToken;
    }

    /**
     * Validate CSRF token
     * @param {string} csrfToken - CSRF token from request
     * @param {string} sessionToken - Session token from request
     * @returns {boolean} True if valid
     */
    validateToken(csrfToken, sessionToken) {
        if (!csrfToken || !sessionToken) {
            return false;
        }

        const tokenData = this.tokens.get(csrfToken);

        if (!tokenData) {
            logger.security('CSRF token not found', {
                csrfToken: csrfToken.substring(0, 8)
            });
            return false;
        }

        // Check if token expired
        if (Date.now() > tokenData.expiresAt) {
            this.tokens.delete(csrfToken);
            logger.security('CSRF token expired', {
                csrfToken: csrfToken.substring(0, 8)
            });
            return false;
        }

        // Verify token matches session
        if (tokenData.sessionToken !== sessionToken) {
            logger.security('CSRF token session mismatch', {
                csrfToken: csrfToken.substring(0, 8),
                sessionToken: sessionToken.substring(0, 8)
            });
            return false;
        }

        return true;
    }

    /**
     * Invalidate CSRF token
     * @param {string} csrfToken - CSRF token to invalidate
     */
    invalidateToken(csrfToken) {
        if (this.tokens.has(csrfToken)) {
            this.tokens.delete(csrfToken);
            logger.debug('CSRF token invalidated', {
                csrfToken: csrfToken.substring(0, 8)
            });
        }
    }

    /**
     * Invalidate all CSRF tokens for a session
     * @param {string} sessionToken - Session token
     */
    invalidateSessionTokens(sessionToken) {
        let invalidated = 0;

        for (const [csrfToken, tokenData] of this.tokens.entries()) {
            if (tokenData.sessionToken === sessionToken) {
                this.tokens.delete(csrfToken);
                invalidated++;
            }
        }

        if (invalidated > 0) {
            logger.debug('CSRF tokens invalidated for session', {
                sessionToken: sessionToken.substring(0, 8),
                count: invalidated
            });
        }

        return invalidated;
    }

    /**
     * Cleanup expired tokens
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleaned = 0;

        for (const [csrfToken, tokenData] of this.tokens.entries()) {
            if (tokenData.expiresAt <= now) {
                this.tokens.delete(csrfToken);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info('Cleaned up expired CSRF tokens', { count: cleaned });
        }

        return cleaned;
    }

    /**
     * Express middleware to generate CSRF token
     * Use this for GET routes that render forms
     */
    generateTokenMiddleware() {
        return (req, res, next) => {
            // Only generate for authenticated requests
            if (req.admin && req.admin.token) {
                const csrfToken = this.generateToken(req.admin.token);

                // Attach to response locals for template rendering
                res.locals.csrfToken = csrfToken;

                // Also send in header for SPA
                res.setHeader('X-CSRF-Token', csrfToken);
            }

            next();
        };
    }

    /**
     * Express middleware to validate CSRF token
     * Use this for POST, PUT, PATCH, DELETE routes
     */
    validateTokenMiddleware(options = {}) {
        const {
            skipMethods = ['GET', 'HEAD', 'OPTIONS'],
            skipPaths = [],
            headerName = 'x-csrf-token',
            bodyField = '_csrf'
        } = options;

        return (req, res, next) => {
            // Skip if method doesn't require CSRF protection
            if (skipMethods.includes(req.method)) {
                return next();
            }

            // Skip if path is excluded
            if (skipPaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            // Get CSRF token from header or body
            const csrfToken = req.headers[headerName] || req.body?.[bodyField];

            // Get session token
            const sessionToken = req.headers['authorization']?.replace('Bearer ', '');

            // Validate CSRF token
            if (!this.validateToken(csrfToken, sessionToken)) {
                logger.security('CSRF validation failed', {
                    method: req.method,
                    path: req.path,
                    ip: req.ip,
                    hasToken: !!csrfToken,
                    hasSession: !!sessionToken
                });

                return res.status(403).json({
                    success: false,
                    error: 'CSRF validation failed',
                    message: 'Invalid or missing CSRF token'
                });
            }

            // CSRF token is valid
            next();
        };
    }

    /**
     * Get token count (for monitoring)
     */
    getTokenCount() {
        return this.tokens.size;
    }

    /**
     * Health check
     */
    healthCheck() {
        return {
            tokenCount: this.tokens.size,
            status: 'healthy'
        };
    }
}

// Create singleton instance
const csrfProtection = new CSRFProtection();

module.exports = csrfProtection;
