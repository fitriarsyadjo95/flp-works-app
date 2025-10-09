/**
 * Signal Manager Module
 * Handles signal storage, retrieval, and management using SQLite database
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('./logger');

class SignalManager {
    constructor() {
        // Initialize database
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'signals.db');
        this.db = new Database(dbPath);
        this.initDatabase();
        logger.info('Signal Manager initialized', { database: dbPath });
    }

    /**
     * Initialize database schema
     */
    initDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS signals (
                id TEXT PRIMARY KEY,
                pair TEXT NOT NULL,
                action TEXT NOT NULL,
                entry REAL NOT NULL,
                stopLoss REAL NOT NULL,
                takeProfit REAL NOT NULL,
                confidence INTEGER,
                risk REAL,
                reasoning TEXT,
                status TEXT DEFAULT 'active',
                source TEXT DEFAULT 'RiskCompass',
                createdAt TEXT NOT NULL,
                closedAt TEXT,
                closePrice REAL,
                profit REAL,
                profitPercent REAL
            );

            CREATE INDEX IF NOT EXISTS idx_status ON signals(status);
            CREATE INDEX IF NOT EXISTS idx_created ON signals(createdAt DESC);
            CREATE INDEX IF NOT EXISTS idx_pair ON signals(pair);
        `);

        logger.debug('Signal database schema initialized');
    }

    /**
     * Save a new signal to the database
     * @param {Object} signalData - Signal data from ASP.NET backend
     * @returns {Object} Saved signal with generated ID
     */
    saveSignal(signalData) {
        try {
            const signal = {
                id: uuidv4(),
                pair: signalData.pair,
                action: signalData.action.toUpperCase(),
                entry: parseFloat(signalData.entry),
                stopLoss: parseFloat(signalData.stopLoss),
                takeProfit: parseFloat(signalData.takeProfit),
                confidence: signalData.confidence ? parseInt(signalData.confidence) : null,
                risk: signalData.risk ? parseFloat(signalData.risk) : null,
                reasoning: signalData.reasoning || null,
                status: 'active',
                source: signalData.source || 'RiskCompass',
                createdAt: signalData.timestamp || new Date().toISOString(),
                closedAt: null,
                closePrice: null,
                profit: null,
                profitPercent: null
            };

            const stmt = this.db.prepare(`
                INSERT INTO signals (
                    id, pair, action, entry, stopLoss, takeProfit,
                    confidence, risk, reasoning, status, source, createdAt,
                    closedAt, closePrice, profit, profitPercent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                signal.id, signal.pair, signal.action, signal.entry,
                signal.stopLoss, signal.takeProfit, signal.confidence,
                signal.risk, signal.reasoning, signal.status,
                signal.source, signal.createdAt, signal.closedAt,
                signal.closePrice, signal.profit, signal.profitPercent
            );

            console.log(`✓ Signal saved: ${signal.action} ${signal.pair} (ID: ${signal.id})`);
            return signal;

        } catch (error) {
            console.error('Error saving signal:', error);
            throw error;
        }
    }

    /**
     * Get all active signals
     * @returns {Array} Array of active signals
     */
    getActiveSignals() {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM signals
                WHERE status = 'active'
                ORDER BY createdAt DESC
            `);
            return stmt.all();
        } catch (error) {
            console.error('Error fetching active signals:', error);
            return [];
        }
    }

    /**
     * Get signal history with optional filters
     * @param {Object} options - Query options
     * @returns {Array} Array of signals
     */
    getSignalHistory(options = {}) {
        try {
            const {
                limit = 50,
                status = null,
                pair = null,
                action = null,
                offset = 0
            } = options;

            let query = 'SELECT * FROM signals WHERE 1=1';
            const params = [];

            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }

            if (pair) {
                query += ' AND pair = ?';
                params.push(pair);
            }

            if (action) {
                query += ' AND action = ?';
                params.push(action);
            }

            query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const stmt = this.db.prepare(query);
            return stmt.all(...params);

        } catch (error) {
            console.error('Error fetching signal history:', error);
            return [];
        }
    }

    /**
     * Get a signal by ID
     * @param {string} id - Signal ID
     * @returns {Object|null} Signal object or null
     */
    getSignalById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM signals WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error fetching signal by ID:', error);
            return null;
        }
    }

    /**
     * Update signal status (when TP/SL hit)
     * @param {string} id - Signal ID
     * @param {Object} updates - Update data
     * @returns {Object|null} Updated signal
     */
    updateSignalStatus(id, updates) {
        try {
            const signal = this.getSignalById(id);
            if (!signal) {
                throw new Error('Signal not found');
            }

            // Calculate profit if closePrice provided
            let profit = updates.profit;
            let profitPercent = updates.profitPercent;

            if (updates.closePrice && signal.entry) {
                const closePrice = parseFloat(updates.closePrice);
                const entry = parseFloat(signal.entry);

                if (signal.action === 'BUY') {
                    profit = closePrice - entry;
                    profitPercent = ((closePrice - entry) / entry) * 100;
                } else { // SELL
                    profit = entry - closePrice;
                    profitPercent = ((entry - closePrice) / entry) * 100;
                }
            }

            const stmt = this.db.prepare(`
                UPDATE signals
                SET status = ?,
                    closePrice = ?,
                    profit = ?,
                    profitPercent = ?,
                    closedAt = ?
                WHERE id = ?
            `);

            stmt.run(
                updates.status || signal.status,
                updates.closePrice || signal.closePrice,
                profit,
                profitPercent,
                updates.closedAt || new Date().toISOString(),
                id
            );

            console.log(`✓ Signal updated: ${id} → ${updates.status}`);
            return this.getSignalById(id);

        } catch (error) {
            console.error('Error updating signal status:', error);
            throw error;
        }
    }

    /**
     * Get statistics for signals
     * @param {Object} options - Filter options
     * @returns {Object} Statistics
     */
    getStatistics(options = {}) {
        try {
            const { timeframe = 'all' } = options;

            let dateFilter = '';
            if (timeframe === 'today') {
                dateFilter = `AND date(createdAt) = date('now')`;
            } else if (timeframe === 'week') {
                dateFilter = `AND createdAt >= datetime('now', '-7 days')`;
            } else if (timeframe === 'month') {
                dateFilter = `AND createdAt >= datetime('now', '-30 days')`;
            }

            const stats = this.db.prepare(`
                SELECT
                    COUNT(*) as totalSignals,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeSignals,
                    SUM(CASE WHEN status = 'closed_win' THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN status = 'closed_loss' THEN 1 ELSE 0 END) as losses,
                    AVG(CASE WHEN profitPercent IS NOT NULL THEN profitPercent ELSE 0 END) as avgProfitPercent,
                    SUM(CASE WHEN profit IS NOT NULL THEN profit ELSE 0 END) as totalProfit
                FROM signals
                WHERE 1=1 ${dateFilter}
            `).get();

            const winRate = stats.wins + stats.losses > 0
                ? (stats.wins / (stats.wins + stats.losses)) * 100
                : 0;

            return {
                ...stats,
                winRate: winRate.toFixed(2),
                avgProfitPercent: parseFloat(stats.avgProfitPercent || 0).toFixed(2)
            };

        } catch (error) {
            console.error('Error fetching statistics:', error);
            return {
                totalSignals: 0,
                activeSignals: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                avgProfitPercent: 0,
                totalProfit: 0
            };
        }
    }

    /**
     * Delete old signals (cleanup)
     * @param {number} daysOld - Delete signals older than this many days
     * @returns {number} Number of deleted signals
     */
    deleteOldSignals(daysOld = 90) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM signals
                WHERE createdAt < datetime('now', '-' || ? || ' days')
                AND status != 'active'
            `);

            const result = stmt.run(daysOld);
            console.log(`✓ Deleted ${result.changes} old signals`);
            return result.changes;

        } catch (error) {
            console.error('Error deleting old signals:', error);
            return 0;
        }
    }

    /**
     * Delete a specific signal (admin function)
     * @param {string} id - Signal ID
     * @returns {boolean} Success status
     */
    deleteSignal(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM signals WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes > 0) {
                console.log(`✓ Signal deleted: ${id}`);
                return true;
            }
            return false;

        } catch (error) {
            console.error('Error deleting signal:', error);
            return false;
        }
    }

    /**
     * Get updated statistics with more detailed metrics
     * @returns {Object} Comprehensive statistics
     */
    getStatistics() {
        try {
            const stats = this.db.prepare(`
                SELECT
                    COUNT(*) as totalSignals,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeSignals,
                    SUM(CASE WHEN status IN ('closed_win', 'closed_loss') THEN 1 ELSE 0 END) as closedSignals,
                    SUM(CASE WHEN status = 'closed_win' THEN 1 ELSE 0 END) as winningSignals,
                    SUM(CASE WHEN status = 'closed_loss' THEN 1 ELSE 0 END) as losingSignals,
                    COALESCE(SUM(profit), 0) as totalProfit,
                    COALESCE(SUM(profitPercent), 0) as totalProfitPercent,
                    COALESCE(AVG(profitPercent), 0) as averageProfit
                FROM signals
            `).get();

            const winRate = stats.closedSignals > 0
                ? (stats.winningSignals / stats.closedSignals) * 100
                : 0;

            return {
                ...stats,
                winRate: parseFloat(winRate.toFixed(2)),
                totalProfit: parseFloat(stats.totalProfit.toFixed(2)),
                totalProfitPercent: parseFloat(stats.totalProfitPercent.toFixed(2)),
                averageProfit: parseFloat(stats.averageProfit.toFixed(2))
            };

        } catch (error) {
            console.error('Error fetching statistics:', error);
            return {
                totalSignals: 0,
                activeSignals: 0,
                closedSignals: 0,
                winningSignals: 0,
                losingSignals: 0,
                winRate: 0,
                totalProfit: 0,
                totalProfitPercent: 0,
                averageProfit: 0
            };
        }
    }

    /**
     * Close database connection
     */
    close() {
        try {
            this.db.close();
            console.log('✓ Database connection closed');
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

// Create singleton instance
const signalManager = new SignalManager();

// Graceful shutdown
process.on('SIGINT', () => {
    signalManager.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    signalManager.close();
    process.exit(0);
});

module.exports = signalManager;
