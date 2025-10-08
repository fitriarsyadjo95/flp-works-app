/**
 * Settings Manager
 * Handles user settings and preferences with database persistence
 */

const Database = require('better-sqlite3');
const path = require('path');

class SettingsManager {
    constructor() {
        const dbPath = path.join(__dirname, '..', 'settings.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initializeDatabase();
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

            CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        `);

        console.log('✓ Settings database schema initialized');
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
}

// Create singleton instance
const settingsManager = new SettingsManager();

module.exports = settingsManager;
