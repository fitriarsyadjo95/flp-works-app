/**
 * Settings API
 * RESTful endpoints for user settings management
 */

const express = require('express');
const router = express.Router();
const SettingsManager = require('./settings-manager');

/**
 * Extract user ID from request headers or generate anonymous ID
 */
function extractUserId(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('User ')) {
        req.userId = authHeader.replace('User ', '');
    } else {
        const userHeader = req.headers['x-user-id'];
        if (userHeader) {
            req.userId = userHeader;
        } else {
            const ip = req.ip || req.connection.remoteAddress;
            req.userId = `anon_${Buffer.from(ip).toString('base64').substring(0, 16)}`;
        }
    }
    next();
}

/**
 * GET /api/settings
 * Get all user settings
 */
router.get('/', extractUserId, (req, res) => {
    try {
        const settings = SettingsManager.getSettings(req.userId);

        res.json({
            success: true,
            settings: {
                profile: {
                    username: settings.username,
                    email: settings.email
                },
                notifications: {
                    signals: settings.notifications_signals === 1,
                    priceAlerts: settings.notifications_price_alerts === 1,
                    newCourses: settings.notifications_new_courses === 1,
                    marketing: settings.notifications_marketing === 1
                },
                app: {
                    darkMode: settings.dark_mode === 1,
                    language: settings.language,
                    currency: settings.currency,
                    timezone: settings.timezone
                },
                privacy: {
                    biometricLogin: settings.biometric_login === 1,
                    analyticsEnabled: settings.analytics_enabled === 1
                }
            }
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/profile
 * Update user profile
 */
router.put('/profile', extractUserId, (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username && !email) {
            return res.status(400).json({
                success: false,
                error: 'At least one field (username or email) is required'
            });
        }

        const result = SettingsManager.updateProfile(req.userId, { username, email });
        const settings = SettingsManager.getSettings(req.userId);

        res.json({
            success: true,
            message: result.message,
            profile: {
                username: settings.username,
                email: settings.email
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/notifications
 * Update notification preferences
 */
router.put('/notifications', extractUserId, (req, res) => {
    try {
        const { signals, priceAlerts, newCourses, marketing } = req.body;

        const result = SettingsManager.updateNotifications(req.userId, {
            signals,
            priceAlerts,
            newCourses,
            marketing
        });

        res.json(result);
    } catch (error) {
        console.error('Update notifications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/app
 * Update app settings
 */
router.put('/app', extractUserId, (req, res) => {
    try {
        const { darkMode, language, currency, timezone } = req.body;

        const result = SettingsManager.updateAppSettings(req.userId, {
            darkMode,
            language,
            currency,
            timezone
        });

        res.json(result);
    } catch (error) {
        console.error('Update app settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/settings/privacy
 * Update privacy settings
 */
router.put('/privacy', extractUserId, (req, res) => {
    try {
        const { biometricLogin, analyticsEnabled } = req.body;

        const result = SettingsManager.updatePrivacySettings(req.userId, {
            biometricLogin,
            analyticsEnabled
        });

        res.json(result);
    } catch (error) {
        console.error('Update privacy settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/settings/reset
 * Reset all settings to defaults
 */
router.post('/reset', extractUserId, (req, res) => {
    try {
        const result = SettingsManager.resetSettings(req.userId);
        const settings = SettingsManager.getSettings(req.userId);

        res.json({
            success: true,
            message: result.message,
            settings: {
                notifications: {
                    signals: settings.notifications_signals === 1,
                    priceAlerts: settings.notifications_price_alerts === 1,
                    newCourses: settings.notifications_new_courses === 1,
                    marketing: settings.notifications_marketing === 1
                },
                app: {
                    darkMode: settings.dark_mode === 1,
                    language: settings.language,
                    currency: settings.currency,
                    timezone: settings.timezone
                },
                privacy: {
                    biometricLogin: settings.biometric_login === 1,
                    analyticsEnabled: settings.analytics_enabled === 1
                }
            }
        });
    } catch (error) {
        console.error('Reset settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/settings/export
 * Export user data
 */
router.get('/export', extractUserId, (req, res) => {
    try {
        const result = SettingsManager.exportUserData(req.userId);

        res.json(result);
    } catch (error) {
        console.error('Export data error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/settings
 * Delete user account and all settings
 */
router.delete('/', extractUserId, (req, res) => {
    try {
        const result = SettingsManager.deleteUserSettings(req.userId);

        res.json(result);
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/settings/cache/clear
 * Clear user cache (placeholder for future implementation)
 */
router.post('/cache/clear', extractUserId, (req, res) => {
    try {
        // For now, just return success
        // In production, this would clear actual cached data
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            cacheSize: '0 MB'
        });
    } catch (error) {
        console.error('Clear cache error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
