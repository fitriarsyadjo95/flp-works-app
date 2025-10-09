/**
 * Audit Logger
 * Tracks all admin actions and security events in database for compliance
 */

const Database = require('better-sqlite3');
const path = require('path');
const logger = require('./logger');

class AuditLogger {
    constructor() {
        // Use main database for audit logs
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'signals.db');
        this.db = new Database(dbPath);
        this.initDatabase();
        logger.info('Audit Logger initialized', { database: dbPath });
    }

    /**
     * Initialize audit log database schema
     */
    initDatabase() {
        this.db.exec(`
            -- Audit logs table
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                action TEXT NOT NULL,
                username TEXT,
                user_id TEXT,
                ip_address TEXT,
                user_agent TEXT,
                resource_type TEXT,
                resource_id TEXT,
                changes TEXT,
                result TEXT,
                error_message TEXT,
                metadata TEXT,
                severity TEXT DEFAULT 'info',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- Indexes for efficient querying
            CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_username ON audit_logs(username);
            CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity);
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

            -- Security events table (subset of audit logs for critical security events)
            CREATE TABLE IF NOT EXISTS security_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                username TEXT,
                ip_address TEXT,
                user_agent TEXT,
                description TEXT,
                severity TEXT DEFAULT 'medium',
                blocked INTEGER DEFAULT 0,
                metadata TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            -- Indexes for security events
            CREATE INDEX IF NOT EXISTS idx_security_timestamp ON security_events(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_security_event_type ON security_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_security_severity ON security_events(severity);
            CREATE INDEX IF NOT EXISTS idx_security_blocked ON security_events(blocked);
        `);

        logger.debug('Audit log database schema initialized');
    }

    /**
     * Log an audit event
     * @param {Object} event - Audit event data
     */
    log(event) {
        try {
            const {
                eventType,
                action,
                username = null,
                userId = null,
                ipAddress = null,
                userAgent = null,
                resourceType = null,
                resourceId = null,
                changes = null,
                result = 'success',
                errorMessage = null,
                metadata = null,
                severity = 'info'
            } = event;

            const id = this.generateId();
            const timestamp = new Date().toISOString();

            const stmt = this.db.prepare(`
                INSERT INTO audit_logs (
                    id, timestamp, event_type, action, username, user_id,
                    ip_address, user_agent, resource_type, resource_id,
                    changes, result, error_message, metadata, severity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                timestamp,
                eventType,
                action,
                username,
                userId,
                ipAddress,
                userAgent,
                resourceType,
                resourceId,
                changes ? JSON.stringify(changes) : null,
                result,
                errorMessage,
                metadata ? JSON.stringify(metadata) : null,
                severity
            );

            // Also log to Winston for real-time monitoring
            logger.audit(action, {
                eventType,
                username,
                ipAddress,
                resourceType,
                resourceId,
                result
            });

            return id;

        } catch (error) {
            logger.error('Failed to write audit log', { error: error.message });
            return null;
        }
    }

    /**
     * Log a security event
     * @param {Object} event - Security event data
     */
    logSecurityEvent(event) {
        try {
            const {
                eventType,
                username = null,
                ipAddress = null,
                userAgent = null,
                description,
                severity = 'medium',
                blocked = false,
                metadata = null
            } = event;

            const id = this.generateId();
            const timestamp = new Date().toISOString();

            const stmt = this.db.prepare(`
                INSERT INTO security_events (
                    id, timestamp, event_type, username, ip_address,
                    user_agent, description, severity, blocked, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                timestamp,
                eventType,
                username,
                ipAddress,
                userAgent,
                description,
                severity,
                blocked ? 1 : 0,
                metadata ? JSON.stringify(metadata) : null
            );

            // Also log to Winston
            logger.security(eventType, {
                username,
                ipAddress,
                description,
                severity,
                blocked
            });

            // Also create audit log entry for security events
            this.log({
                eventType: 'security',
                action: eventType,
                username,
                ipAddress,
                userAgent,
                metadata: { description, blocked },
                severity: severity === 'critical' ? 'error' : 'warn'
            });

            return id;

        } catch (error) {
            logger.error('Failed to write security event', { error: error.message });
            return null;
        }
    }

    /**
     * Get audit logs with filtering and pagination
     * @param {Object} options - Query options
     */
    getAuditLogs(options = {}) {
        try {
            const {
                username = null,
                eventType = null,
                action = null,
                severity = null,
                startDate = null,
                endDate = null,
                limit = 100,
                offset = 0
            } = options;

            let query = 'SELECT * FROM audit_logs WHERE 1=1';
            const params = [];

            if (username) {
                query += ' AND username = ?';
                params.push(username);
            }

            if (eventType) {
                query += ' AND event_type = ?';
                params.push(eventType);
            }

            if (action) {
                query += ' AND action = ?';
                params.push(action);
            }

            if (severity) {
                query += ' AND severity = ?';
                params.push(severity);
            }

            if (startDate) {
                query += ' AND timestamp >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND timestamp <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const logs = stmt.all(...params);

            // Parse JSON fields
            return logs.map(log => ({
                ...log,
                changes: log.changes ? JSON.parse(log.changes) : null,
                metadata: log.metadata ? JSON.parse(log.metadata) : null
            }));

        } catch (error) {
            logger.error('Failed to fetch audit logs', { error: error.message });
            return [];
        }
    }

    /**
     * Get security events with filtering
     */
    getSecurityEvents(options = {}) {
        try {
            const {
                eventType = null,
                severity = null,
                blocked = null,
                startDate = null,
                endDate = null,
                limit = 100,
                offset = 0
            } = options;

            let query = 'SELECT * FROM security_events WHERE 1=1';
            const params = [];

            if (eventType) {
                query += ' AND event_type = ?';
                params.push(eventType);
            }

            if (severity) {
                query += ' AND severity = ?';
                params.push(severity);
            }

            if (blocked !== null) {
                query += ' AND blocked = ?';
                params.push(blocked ? 1 : 0);
            }

            if (startDate) {
                query += ' AND timestamp >= ?';
                params.push(startDate);
            }

            if (endDate) {
                query += ' AND timestamp <= ?';
                params.push(endDate);
            }

            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            const events = stmt.all(...params);

            // Parse JSON fields
            return events.map(event => ({
                ...event,
                metadata: event.metadata ? JSON.parse(event.metadata) : null,
                blocked: event.blocked === 1
            }));

        } catch (error) {
            logger.error('Failed to fetch security events', { error: error.message });
            return [];
        }
    }

    /**
     * Get audit log statistics
     */
    getStatistics(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const stats = {
                totalEvents: this.db.prepare(
                    'SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= ?'
                ).get(startDate.toISOString()).count,

                eventsByType: this.db.prepare(`
                    SELECT event_type, COUNT(*) as count
                    FROM audit_logs
                    WHERE timestamp >= ?
                    GROUP BY event_type
                    ORDER BY count DESC
                `).all(startDate.toISOString()),

                eventsBySeverity: this.db.prepare(`
                    SELECT severity, COUNT(*) as count
                    FROM audit_logs
                    WHERE timestamp >= ?
                    GROUP BY severity
                `).all(startDate.toISOString()),

                topUsers: this.db.prepare(`
                    SELECT username, COUNT(*) as count
                    FROM audit_logs
                    WHERE timestamp >= ? AND username IS NOT NULL
                    GROUP BY username
                    ORDER BY count DESC
                    LIMIT 10
                `).all(startDate.toISOString()),

                failedActions: this.db.prepare(
                    'SELECT COUNT(*) as count FROM audit_logs WHERE result = ? AND timestamp >= ?'
                ).get('failure', startDate.toISOString()).count,

                securityEvents: this.db.prepare(
                    'SELECT COUNT(*) as count FROM security_events WHERE timestamp >= ?'
                ).get(startDate.toISOString()).count,

                blockedAttempts: this.db.prepare(
                    'SELECT COUNT(*) as count FROM security_events WHERE blocked = 1 AND timestamp >= ?'
                ).get(startDate.toISOString()).count
            };

            return stats;

        } catch (error) {
            logger.error('Failed to fetch audit statistics', { error: error.message });
            return null;
        }
    }

    /**
     * Clean up old audit logs (for GDPR compliance)
     * @param {number} retentionDays - Number of days to retain logs
     */
    cleanup(retentionDays = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const deletedAudit = this.db.prepare(
                'DELETE FROM audit_logs WHERE timestamp < ?'
            ).run(cutoffDate.toISOString()).changes;

            const deletedSecurity = this.db.prepare(
                'DELETE FROM security_events WHERE timestamp < ?'
            ).run(cutoffDate.toISOString()).changes;

            logger.info('Audit log cleanup completed', {
                retentionDays,
                deletedAudit,
                deletedSecurity
            });

            return { deletedAudit, deletedSecurity };

        } catch (error) {
            logger.error('Failed to cleanup audit logs', { error: error.message });
            return null;
        }
    }

    /**
     * Export audit logs to JSON
     */
    export(options = {}) {
        try {
            const logs = this.getAuditLogs({ ...options, limit: 10000 });
            return {
                exportedAt: new Date().toISOString(),
                totalRecords: logs.length,
                logs
            };
        } catch (error) {
            logger.error('Failed to export audit logs', { error: error.message });
            return null;
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Close database connection
     */
    close() {
        try {
            this.db.close();
            logger.info('Audit logger database connection closed');
        } catch (error) {
            logger.error('Error closing audit logger database', { error: error.message });
        }
    }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = auditLogger;
