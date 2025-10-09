/**
 * Settings Manager
 * Handles user settings and preferences with database persistence
 */

const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');

class SettingsManager {
    constructor() {
        const dbPath = process.env.SETTINGS_DATABASE_PATH || path.join(__dirname, '..', 'settings.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeDatabase();
        logger.info('Settings Manager initialized', { database: dbPath });
    }

    /**
     * Initialize database schema
     */
    initializeDatabase() {
        // User settings table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_settings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,

                -- Profile settings
                username TEXT,
                email TEXT,

                -- Membership settings
                membership_tier TEXT DEFAULT 'free',
                is_pro INTEGER DEFAULT 0,
                pro_since DATETIME,

                -- Notification preferences
                notifications_signals INTEGER DEFAULT 1,
                notifications_price_alerts INTEGER DEFAULT 1,
                notifications_new_courses INTEGER DEFAULT 0,
                notifications_marketing INTEGER DEFAULT 0,

                -- App settings
                dark_mode INTEGER DEFAULT 1,
                language TEXT DEFAULT 'en',
                currency TEXT DEFAULT 'USD',
                timezone TEXT DEFAULT 'EST',

                -- Privacy settings
                biometric_login INTEGER DEFAULT 0,
                analytics_enabled INTEGER DEFAULT 1,

                -- Metadata
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT,
                description TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Insert default Telegram upgrade link
            INSERT OR IGNORE INTO app_config (key, value, description)
            VALUES ('telegram_upgrade_link', 'https://t.me/yourusername', 'Telegram DM link for Pro membership upgrade');

            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        `);

        logger.debug('Settings database schema initialized');
    }

    /**
     * Get user settings
     */
    getSettings(userId) {
        let settings = this.db.prepare(`
            SELECT * FROM user_settings WHERE user_id = ?
        `).get(userId);

        // Create default settings if none exist
        if (!settings) {
            settings = this.createDefaultSettings(userId);
        }

        return settings;
    }

    /**
     * Create default settings for new user
     */
    createDefaultSettings(userId) {
        const id = `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.db.prepare(`
            INSERT INTO user_settings (
                id, user_id, dark_mode, language, currency, timezone,
                notifications_signals, notifications_price_alerts,
                notifications_new_courses, notifications_marketing,
                biometric_login, analytics_enabled
            ) VALUES (?, ?, 1, 'en', 'USD', 'EST', 1, 1, 0, 0, 0, 1)
        `).run(id, userId);

        return this.getSettings(userId);
    }

    /**
     * Update user profile
     */
    updateProfile(userId, { username, email }) {
        const existing = this.getSettings(userId);

        this.db.prepare(`
            UPDATE user_settings
            SET username = ?, email = ?, updated_at = datetime('now')
            WHERE user_id = ?
        `).run(username || existing.username, email || existing.email, userId);

        return { success: true, message: 'Profile updated successfully' };
    }

    /**
     * Update notification preferences
     */
    updateNotifications(userId, preferences) {
        const updates = [];
        const values = [];

        if (preferences.signals !== undefined) {
            updates.push('notifications_signals = ?');
            values.push(preferences.signals ? 1 : 0);
        }
        if (preferences.priceAlerts !== undefined) {
            updates.push('notifications_price_alerts = ?');
            values.push(preferences.priceAlerts ? 1 : 0);
        }
        if (preferences.newCourses !== undefined) {
            updates.push('notifications_new_courses = ?');
            values.push(preferences.newCourses ? 1 : 0);
        }
        if (preferences.marketing !== undefined) {
            updates.push('notifications_marketing = ?');
            values.push(preferences.marketing ? 1 : 0);
        }

        if (updates.length > 0) {
            updates.push('updated_at = datetime(\'now\')');
            values.push(userId);

            this.db.prepare(`
                UPDATE user_settings
                SET ${updates.join(', ')}
                WHERE user_id = ?
            `).run(...values);
        }

        return { success: true, message: 'Notification preferences updated' };
    }

    /**
     * Update app settings
     */
    updateAppSettings(userId, settings) {
        const updates = [];
        const values = [];

        if (settings.darkMode !== undefined) {
            updates.push('dark_mode = ?');
            values.push(settings.darkMode ? 1 : 0);
        }
        if (settings.language) {
            updates.push('language = ?');
            values.push(settings.language);
        }
        if (settings.currency) {
            updates.push('currency = ?');
            values.push(settings.currency);
        }
        if (settings.timezone) {
            updates.push('timezone = ?');
            values.push(settings.timezone);
        }

        if (updates.length > 0) {
            updates.push('updated_at = datetime(\'now\')');
            values.push(userId);

            this.db.prepare(`
                UPDATE user_settings
                SET ${updates.join(', ')}
                WHERE user_id = ?
            `).run(...values);
        }

        return { success: true, message: 'App settings updated' };
    }

    /**
     * Update privacy settings
     */
    updatePrivacySettings(userId, settings) {
        const updates = [];
        const values = [];

        if (settings.biometricLogin !== undefined) {
            updates.push('biometric_login = ?');
            values.push(settings.biometricLogin ? 1 : 0);
        }
        if (settings.analyticsEnabled !== undefined) {
            updates.push('analytics_enabled = ?');
            values.push(settings.analyticsEnabled ? 1 : 0);
        }

        if (updates.length > 0) {
            updates.push('updated_at = datetime(\'now\')');
            values.push(userId);

            this.db.prepare(`
                UPDATE user_settings
                SET ${updates.join(', ')}
                WHERE user_id = ?
            `).run(...values);
        }

        return { success: true, message: 'Privacy settings updated' };
    }

    /**
     * Reset all settings to defaults
     */
    resetSettings(userId) {
        this.db.prepare(`
            UPDATE user_settings
            SET dark_mode = 1,
                language = 'en',
                currency = 'USD',
                timezone = 'EST',
                notifications_signals = 1,
                notifications_price_alerts = 1,
                notifications_new_courses = 0,
                notifications_marketing = 0,
                biometric_login = 0,
                analytics_enabled = 1,
                updated_at = datetime('now')
            WHERE user_id = ?
        `).run(userId);

        return { success: true, message: 'All settings reset to defaults' };
    }

    /**
     * Delete user settings
     */
    deleteUserSettings(userId) {
        this.db.prepare(`
            DELETE FROM user_settings WHERE user_id = ?
        `).run(userId);

        return { success: true, message: 'User settings deleted' };
    }

    /**
     * Export user data
     */
    exportUserData(userId) {
        const settings = this.getSettings(userId);

        return {
            success: true,
            data: {
                profile: {
                    username: settings.username,
                    email: settings.email
                },
                preferences: {
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
                },
                exportDate: new Date().toISOString()
            }
        };
    }

    /**
     * Check if user is pro member
     */
    isProMember(userId) {
        const settings = this.getSettings(userId);
        return settings.is_pro === 1;
    }

    /**
     * Update user membership status
     */
    updateMembership(userId, isPro) {
        const existing = this.getSettings(userId);

        this.db.prepare(`
            UPDATE user_settings
            SET is_pro = ?,
                membership_tier = ?,
                pro_since = CASE WHEN ? = 1 AND is_pro = 0 THEN datetime('now') ELSE pro_since END,
                updated_at = datetime('now')
            WHERE user_id = ?
        `).run(isPro ? 1 : 0, isPro ? 'pro' : 'free', isPro ? 1 : 0, userId);

        return { success: true, message: `Membership updated to ${isPro ? 'Pro' : 'Free'}` };
    }

    /**
     * Get app configuration
     */
    getAppConfig(key) {
        const config = this.db.prepare(`
            SELECT value FROM app_config WHERE key = ?
        `).get(key);

        return config ? config.value : null;
    }

    /**
     * Update app configuration
     */
    updateAppConfig(key, value) {
        this.db.prepare(`
            INSERT OR REPLACE INTO app_config (key, value, updated_at)
            VALUES (?, ?, datetime('now'))
        `).run(key, value);

        return { success: true, message: 'Configuration updated' };
    }

    /**
     * Get all users (for admin)
     */
    getAllUsers() {
        const users = this.db.prepare(`
            SELECT user_id, username, email, is_pro, membership_tier, pro_since, created_at
            FROM user_settings
            ORDER BY created_at DESC
        `).all();

        return users.map(user => ({
            userId: user.user_id,
            username: user.username || 'Anonymous',
            email: user.email || 'N/A',
            isPro: user.is_pro === 1,
            membershipTier: user.membership_tier,
            proSince: user.pro_since,
            createdAt: user.created_at
        }));
    }
}

// Create singleton instance
const settingsManager = new SettingsManager();

module.exports = settingsManager;
