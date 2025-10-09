/**
 * Admin API Routes
 * Handles all admin panel operations
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const adminAuth = require('./admin-auth');
const SignalManager = require('./signal-manager');
const logger = require('./logger');
const csrfProtection = require('./csrf-protection');
const auditLogger = require('./audit-logger');

// CSRF protection middleware - skip login endpoint
const csrfMiddleware = csrfProtection.validateTokenMiddleware({
    skipPaths: ['/login']
});

// Rate limiter for login endpoint (stricter than global)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5, // 5 attempts
    skipSuccessfulRequests: true, // Don't count successful logins
    handler: (req, res) => {
        logger.security('Login rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('user-agent')
        });
        res.status(429).json({
            success: false,
            error: 'Too many login attempts',
            message: 'Please try again in 15 minutes'
        });
    }
});

/**
 * Admin Login
 * POST /api/admin/login
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            logger.security('Login attempt with missing credentials', { ip: req.ip });
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Async login with bcrypt
        const result = await adminAuth.login(username, password, req.ip);

        if (!result) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Incorrect username or password'
            });
        }

        res.json(result);
    } catch (error) {
        logger.error('Admin login error', { error: error.message, ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
});

/**
 * Admin Logout
 * POST /api/admin/logout
 */
router.post('/logout', adminAuth.requireAuth(), csrfMiddleware, async (req, res) => {
    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        await adminAuth.logout(token);

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Admin logout error', { error: error.message, ip: req.ip });
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            message: error.message
        });
    }
});

/**
 * Validate Session and Get CSRF Token
 * GET /api/admin/validate
 */
router.get('/validate', adminAuth.requireAuth(), csrfProtection.generateTokenMiddleware(), (req, res) => {
    res.json({
        success: true,
        admin: {
            username: req.admin.username,
            role: req.admin.role,
            email: req.admin.email
        },
        csrfToken: res.locals.csrfToken
    });
});

/**
 * Dashboard Statistics
 * GET /api/admin/dashboard
 */
router.get('/dashboard', adminAuth.requireAuth(), (req, res) => {
    try {
        // Get signal statistics
        const stats = SignalManager.getStatistics();
        const activeSignals = SignalManager.getActiveSignals();
        const recentSignals = SignalManager.getSignalHistory(10, 0);

        // Get session info
        const activeSessions = adminAuth.getActiveSessions();

        // Calculate additional metrics
        const now = Date.now();
        const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
        const allSignals = SignalManager.getSignalHistory(1000, 0);

        const signalsLast24h = allSignals.filter(s => s.createdAt >= last24h).length;
        const closedLast24h = allSignals.filter(s =>
            s.closedAt && s.closedAt >= last24h
        ).length;

        // Calculate win rate for last 24h
        const closedSignals24h = allSignals.filter(s =>
            s.closedAt &&
            s.closedAt >= last24h &&
            ['closed_win', 'closed_loss'].includes(s.status)
        );
        const wins24h = closedSignals24h.filter(s => s.status === 'closed_win').length;
        const winRate24h = closedSignals24h.length > 0
            ? ((wins24h / closedSignals24h.length) * 100).toFixed(2)
            : 0;

        res.json({
            success: true,
            dashboard: {
                signals: {
                    total: stats.totalSignals,
                    active: stats.activeSignals,
                    closed: stats.closedSignals,
                    last24h: signalsLast24h,
                    closedLast24h: closedLast24h,
                    winRate: stats.winRate,
                    winRate24h: parseFloat(winRate24h)
                },
                performance: {
                    totalProfit: stats.totalProfit,
                    totalProfitPercent: stats.totalProfitPercent,
                    averageProfit: stats.averageProfit,
                    winningSignals: stats.winningSignals,
                    losingSignals: stats.losingSignals
                },
                system: {
                    activeSessions: activeSessions.length,
                    serverUptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    nodeVersion: process.version
                },
                recentSignals: recentSignals.slice(0, 5) // Last 5 signals
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dashboard',
            message: error.message
        });
    }
});

/**
 * Get All Signals (with filtering and pagination)
 * GET /api/admin/signals
 */
router.get('/signals', adminAuth.requireAuth(), (req, res) => {
    try {
        const {
            status,
            pair,
            limit = 50,
            offset = 0,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        let signals = SignalManager.getSignalHistory(parseInt(limit), parseInt(offset), status);

        // Filter by pair if specified
        if (pair) {
            signals = signals.filter(s => s.pair === pair);
        }

        // Get unique pairs for filter dropdown
        const allSignals = SignalManager.getSignalHistory(10000, 0);
        const uniquePairs = [...new Set(allSignals.map(s => s.pair))].sort();

        res.json({
            success: true,
            count: signals.length,
            filters: {
                pairs: uniquePairs,
                statuses: ['active', 'closed_win', 'closed_loss']
            },
            signals
        });
    } catch (error) {
        console.error('Get signals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve signals',
            message: error.message
        });
    }
});

/**
 * Get Single Signal Details
 * GET /api/admin/signals/:id
 */
router.get('/signals/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const { id } = req.params;
        const signal = SignalManager.getSignalById(id);

        if (!signal) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }

        res.json({
            success: true,
            signal
        });
    } catch (error) {
        console.error('Get signal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve signal',
            message: error.message
        });
    }
});

/**
 * Update Signal (admin can manually edit signals)
 * PATCH /api/admin/signals/:id
 */
router.patch('/signals/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Admin can update any field
        const updatedSignal = SignalManager.updateSignalStatus(id, updates);

        if (!updatedSignal) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }

        console.log(`✓ Signal ${id} updated by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'Signal updated successfully',
            signal: updatedSignal
        });
    } catch (error) {
        console.error('Update signal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update signal',
            message: error.message
        });
    }
});

/**
 * Delete Signal
 * DELETE /api/admin/signals/:id
 */
router.delete('/signals/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const { id } = req.params;
        const result = SignalManager.deleteSignal(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Signal not found'
            });
        }

        console.log(`✓ Signal ${id} deleted by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'Signal deleted successfully'
        });
    } catch (error) {
        console.error('Delete signal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete signal',
            message: error.message
        });
    }
});

/**
 * Manually Create Signal (admin can create test signals)
 * POST /api/admin/signals
 */
router.post('/signals', adminAuth.requireAuth(), (req, res) => {
    try {
        const signalData = {
            ...req.body,
            source: `Admin:${req.admin.username}`
        };

        const signal = SignalManager.saveSignal(signalData);

        // Broadcast via WebSocket if io is available
        if (global.io) {
            global.io.emit('new-signal', signal);
        }

        console.log(`✓ Manual signal created by admin "${req.admin.username}"`);

        res.status(201).json({
            success: true,
            message: 'Signal created successfully',
            signal
        });
    } catch (error) {
        console.error('Create signal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create signal',
            message: error.message
        });
    }
});

/**
 * Get Active Admin Sessions
 * GET /api/admin/sessions
 */
router.get('/sessions', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const sessions = adminAuth.getActiveSessions();

        res.json({
            success: true,
            count: sessions.length,
            sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve sessions',
            message: error.message
        });
    }
});

/**
 * Create New Admin (super_admin only)
 * POST /api/admin/create
 */
router.post('/create', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const { username, password, email, role } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({
                success: false,
                error: 'Username, password, and email are required'
            });
        }

        const result = adminAuth.createAdmin(
            { username, password, email, role },
            req.admin.role
        );

        res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create admin',
            message: error.message
        });
    }
});

/**
 * Change Password
 * POST /api/admin/change-password
 */
router.post('/change-password', adminAuth.requireAuth(), (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Old password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters'
            });
        }

        const result = adminAuth.changePassword(
            req.admin.username,
            oldPassword,
            newPassword
        );

        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password',
            message: error.message
        });
    }
});

/**
 * Export Signals to CSV
 * GET /api/admin/signals/export/csv
 */
router.get('/signals/export/csv', adminAuth.requireAuth(), (req, res) => {
    try {
        const signals = SignalManager.getSignalHistory(10000, 0);

        // Generate CSV
        const headers = [
            'ID', 'Pair', 'Action', 'Entry', 'Stop Loss', 'Take Profit',
            'Confidence', 'Risk', 'Status', 'Created At', 'Closed At',
            'Close Price', 'Profit', 'Profit %', 'Source', 'Reasoning'
        ];

        const rows = signals.map(s => [
            s.id,
            s.pair,
            s.action,
            s.entry,
            s.stopLoss,
            s.takeProfit,
            s.confidence || '',
            s.risk || '',
            s.status,
            s.createdAt,
            s.closedAt || '',
            s.closePrice || '',
            s.profit || '',
            s.profitPercent || '',
            s.source,
            (s.reasoning || '').replace(/"/g, '""') // Escape quotes
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="signals-${Date.now()}.csv"`);
        res.send(csv);

        console.log(`✓ Signals exported by admin "${req.admin.username}"`);
    } catch (error) {
        console.error('Export signals error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export signals',
            message: error.message
        });
    }
});

/**
 * Get Audit Logs
 * GET /api/admin/audit-logs
 */
router.get('/audit-logs', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const { username, eventType, action, severity, startDate, endDate, limit, offset } = req.query;

        const logs = auditLogger.getAuditLogs({
            username,
            eventType,
            action,
            severity,
            startDate,
            endDate,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            logs,
            count: logs.length
        });

    } catch (error) {
        logger.error('Failed to fetch audit logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit logs',
            message: error.message
        });
    }
});

/**
 * Get Security Events
 * GET /api/admin/security-events
 */
router.get('/security-events', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const { eventType, severity, blocked, startDate, endDate, limit, offset } = req.query;

        const events = auditLogger.getSecurityEvents({
            eventType,
            severity,
            blocked: blocked === 'true' ? true : blocked === 'false' ? false : null,
            startDate,
            endDate,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            events,
            count: events.length
        });

    } catch (error) {
        logger.error('Failed to fetch security events', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch security events',
            message: error.message
        });
    }
});

/**
 * Get Audit Statistics
 * GET /api/admin/audit-stats
 */
router.get('/audit-stats', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const stats = auditLogger.getStatistics(days);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        logger.error('Failed to fetch audit statistics', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit statistics',
            message: error.message
        });
    }
});

/**
 * Export Audit Logs
 * GET /api/admin/audit-logs/export
 */
router.get('/audit-logs/export', adminAuth.requireAuth(), adminAuth.requireRole(['super_admin']), (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const exportData = auditLogger.export({ startDate, endDate });

        auditLogger.log({
            eventType: 'admin_action',
            action: 'export_audit_logs',
            username: req.admin.username,
            ipAddress: req.ip,
            result: 'success',
            metadata: { recordCount: exportData.totalRecords }
        });

        res.json({
            success: true,
            ...exportData
        });

    } catch (error) {
        logger.error('Failed to export audit logs', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to export audit logs',
            message: error.message
        });
    }
});

module.exports = router;
