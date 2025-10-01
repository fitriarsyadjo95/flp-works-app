/**
 * Authentication Module
 * Handles secure user authentication, session management, and authorization
 * Uses Capacitor Preferences for secure storage
 */

import { Preferences } from '@capacitor/preferences';

class AuthManager {
    constructor() {
        this.SESSION_KEY = 'flp_session';
        this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    }

    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean} True if valid email format
     */
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Validate password strength
     * Requirements: At least 8 characters, 1 uppercase, 1 lowercase, 1 number
     * @param {string} password - Password to validate
     * @returns {Object} {valid: boolean, errors: string[]}
     */
    validatePassword(password) {
        const errors = [];

        if (!password || typeof password !== 'string') {
            return { valid: false, errors: ['Password is required'] };
        }

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanitize user input to prevent XSS
     * @param {string} input - User input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        return input
            .trim()
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, ''); // Remove event handlers
    }

    /**
     * Login user with credentials
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password) {
        try {
            // Validate email
            if (!this.validateEmail(email)) {
                return {
                    success: false,
                    error: 'Please enter a valid email address'
                };
            }

            // Validate password
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    error: passwordValidation.errors[0]
                };
            }

            // Sanitize inputs
            const sanitizedEmail = this.sanitizeInput(email.toLowerCase());

            // Demo mode: Accept demo credentials
            // TODO: Replace with actual API authentication
            const validDemoEmails = ['demo@flpacademyworks.com', 'test@flpacademyworks.com'];

            if (!validDemoEmails.includes(sanitizedEmail)) {
                return {
                    success: false,
                    error: 'Invalid credentials. Try demo@flpacademyworks.com'
                };
            }

            // Create session
            const session = {
                email: sanitizedEmail,
                name: sanitizedEmail.split('@')[0],
                loginTime: new Date().toISOString(),
                expiresAt: Date.now() + this.SESSION_DURATION,
                isLoggedIn: true,
                sessionId: this.generateSessionId()
            };

            // Store securely
            await this.saveSession(session);

            return {
                success: true,
                user: {
                    email: session.email,
                    name: session.name
                }
            };

        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'An error occurred during login. Please try again.'
            };
        }
    }

    /**
     * Register new user
     * @param {string} name - User's full name
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} Registration result
     */
    async register(name, email, password) {
        try {
            // Validate name
            if (!name || name.trim().length < 2) {
                return {
                    success: false,
                    error: 'Please enter your full name'
                };
            }

            // Validate email
            if (!this.validateEmail(email)) {
                return {
                    success: false,
                    error: 'Please enter a valid email address'
                };
            }

            // Validate password
            const passwordValidation = this.validatePassword(password);
            if (!passwordValidation.valid) {
                return {
                    success: false,
                    error: passwordValidation.errors.join(', ')
                };
            }

            // Sanitize inputs
            const sanitizedName = this.sanitizeInput(name);
            const sanitizedEmail = this.sanitizeInput(email.toLowerCase());

            // Demo mode: Auto-register and login
            // TODO: Replace with actual API registration
            const session = {
                email: sanitizedEmail,
                name: sanitizedName,
                loginTime: new Date().toISOString(),
                expiresAt: Date.now() + this.SESSION_DURATION,
                isLoggedIn: true,
                sessionId: this.generateSessionId()
            };

            await this.saveSession(session);

            return {
                success: true,
                user: {
                    email: session.email,
                    name: session.name
                }
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'An error occurred during registration. Please try again.'
            };
        }
    }

    /**
     * Check if user is authenticated and session is valid
     * @returns {Promise<Object|null>} User object if authenticated, null otherwise
     */
    async checkAuth() {
        try {
            const session = await this.getSession();

            if (!session) {
                return null;
            }

            // Check if session has expired
            if (session.expiresAt && session.expiresAt < Date.now()) {
                console.log('Session expired, logging out');
                await this.logout();
                return null;
            }

            return {
                email: session.email,
                name: session.name,
                loginTime: session.loginTime
            };

        } catch (error) {
            console.error('Auth check error:', error);
            return null;
        }
    }

    /**
     * Logout user and clear session
     * @returns {Promise<void>}
     */
    async logout() {
        try {
            await Preferences.remove({ key: this.SESSION_KEY });

            // Also clear any legacy localStorage data
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('flp_user');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Get current session from secure storage
     * @private
     * @returns {Promise<Object|null>} Session object or null
     */
    async getSession() {
        try {
            const { value } = await Preferences.get({ key: this.SESSION_KEY });

            if (!value) {
                return null;
            }

            return JSON.parse(value);
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    }

    /**
     * Save session to secure storage
     * @private
     * @param {Object} session - Session object to save
     * @returns {Promise<void>}
     */
    async saveSession(session) {
        try {
            await Preferences.set({
                key: this.SESSION_KEY,
                value: JSON.stringify(session)
            });
        } catch (error) {
            console.error('Save session error:', error);
            throw error;
        }
    }

    /**
     * Generate random session ID
     * @private
     * @returns {string} Random session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Require authentication for page access
     * Redirects to login if not authenticated
     * @returns {Promise<Object|null>} User object if authenticated
     */
    async requireAuth() {
        const user = await this.checkAuth();

        if (!user) {
            // Store intended destination for redirect after login
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('redirect_after_login', window.location.pathname);
            }
            window.location.href = 'index.html';
            return null;
        }

        return user;
    }

    /**
     * Migrate legacy localStorage data to secure storage
     * @returns {Promise<boolean>} True if migration successful
     */
    async migrateLegacyStorage() {
        try {
            if (typeof localStorage === 'undefined') {
                return false;
            }

            const legacyData = localStorage.getItem('flp_user');
            if (!legacyData) {
                return false;
            }

            const userData = JSON.parse(legacyData);

            // Create new session from legacy data
            const session = {
                email: userData.email,
                name: userData.name,
                loginTime: userData.loginTime || new Date().toISOString(),
                expiresAt: Date.now() + this.SESSION_DURATION,
                isLoggedIn: true,
                sessionId: this.generateSessionId()
            };

            await this.saveSession(session);
            localStorage.removeItem('flp_user');

            console.log('Successfully migrated legacy storage');
            return true;

        } catch (error) {
            console.error('Migration error:', error);
            return false;
        }
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in HTML files and modules
if (typeof window !== 'undefined') {
    window.AuthManager = authManager;
}

export default authManager;
