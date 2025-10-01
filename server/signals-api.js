/**
 * Signals API Routes
 * Handles signal ingestion from ASP.NET backend and client requests
 */

const express = require('express');
const router = express.Router();
const SignalManager = require('./signal-manager');

// Store reference to Socket.IO instance (will be set by server.js)
let io = null;

function setIO(socketIO) {
    io = socketIO;
}

/**
 * Middleware: Authenticate signal ingestion from ASP.NET backend
 */
function authenticateSignalAPI(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedKey = process.env.SIGNAL_API_KEY || 'your-secure-api-key-change-in-production';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header'
        });
    }

    const providedKey = authHeader.substring(7); // Remove 'Bearer '

    if (providedKey !== expectedKey) {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Invalid API key'
        });
    }

    next();
}

/**
 * POST /api/signals/ingest
 * Receive new signal from ASP.NET backend
 */
router.post('/ingest', authenticateSignalAPI, async (req, res) => {
    try {
        const signalData = req.body;

        // Validate required fields
        if (!signalData.pair || !signalData.action || !signalData.entry) {
            return res.status(400).json({
                error: 'Invalid signal data',
                message: 'Missing required fields: pair, action, entry'
            });
        }

        // Validate action
        if (!['BUY', 'SELL'].includes(signalData.action.toUpperCase())) {
            return res.status(400).json({
                error: 'Invalid action',
                message: 'Action must be BUY or SELL'
            });
        }

        // Validate numeric fields
        if (isNaN(signalData.entry) || isNaN(signalData.stopLoss) || isNaN(signalData.takeProfit)) {
            return res.status(400).json({
                error: 'Invalid numeric values',
                message: 'Entry, stopLoss, and takeProfit must be valid numbers'
            });
        }

        // Save signal to database
        const savedSignal = SignalManager.saveSignal(signalData);

        // Broadcast to all connected WebSocket clients
        if (io) {
            io.emit('new-signal', savedSignal);
            console.log(`✓ Signal broadcasted to ${io.sockets.sockets.size} connected clients`);
        }

        // Return success response
        res.status(201).json({
            success: true,
            signalId: savedSignal.id,
            message: 'Signal received and broadcasted',
            signal: savedSignal
        });

    } catch (error) {
        console.error('Signal ingest error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to process signal'
        });
    }
});

/**
 * GET /api/signals/active
 * Get all active signals
 */
router.get('/active', async (req, res) => {
    try {
        const signals = SignalManager.getActiveSignals();

        res.json({
            success: true,
            count: signals.length,
            signals: signals
        });

    } catch (error) {
        console.error('Error fetching active signals:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch active signals'
        });
    }
});

/**
 * GET /api/signals/history
 * Get signal history with pagination
 */
router.get('/history', async (req, res) => {
    try {
        const options = {
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0,
            status: req.query.status || null,
            pair: req.query.pair || null,
            action: req.query.action || null
        };

        const signals = SignalManager.getSignalHistory(options);

        res.json({
            success: true,
            count: signals.length,
            limit: options.limit,
            offset: options.offset,
            signals: signals
        });

    } catch (error) {
        console.error('Error fetching signal history:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch signal history'
        });
    }
});

/**
 * GET /api/signals/:id
 * Get a specific signal by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const signal = SignalManager.getSignalById(id);

        if (!signal) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Signal not found'
            });
        }

        res.json({
            success: true,
            signal: signal
        });

    } catch (error) {
        console.error('Error fetching signal:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch signal'
        });
    }
});

/**
 * PATCH /api/signals/:id/status
 * Update signal status (when TP/SL hit)
 */
router.patch('/:id/status', authenticateSignalAPI, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, closePrice, profit, profitPercent } = req.body;

        // Validate status
        const validStatuses = ['active', 'closed_win', 'closed_loss', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Update signal
        const updatedSignal = SignalManager.updateSignalStatus(id, {
            status,
            closePrice,
            profit,
            profitPercent,
            closedAt: new Date().toISOString()
        });

        // Broadcast update to all connected clients
        if (io) {
            io.emit('signal-update', updatedSignal);
        }

        res.json({
            success: true,
            message: 'Signal updated successfully',
            signal: updatedSignal
        });

    } catch (error) {
        console.error('Error updating signal:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message || 'Failed to update signal'
        });
    }
});

/**
 * GET /api/signals/stats
 * Get signal statistics
 */
router.get('/stats/summary', async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 'all';
        const stats = SignalManager.getStatistics({ timeframe });

        res.json({
            success: true,
            timeframe: timeframe,
            statistics: stats
        });

    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to fetch statistics'
        });
    }
});

/**
 * POST /api/signals/test
 * Test endpoint to send a mock signal (development only)
 */
router.post('/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Test endpoint not available in production'
        });
    }

    try {
        const testSignal = {
            pair: req.body.pair || 'EUR/USD',
            action: req.body.action || 'BUY',
            entry: req.body.entry || 1.0850,
            stopLoss: req.body.stopLoss || 1.0820,
            takeProfit: req.body.takeProfit || 1.0920,
            confidence: req.body.confidence || 85,
            risk: req.body.risk || 2.5,
            reasoning: req.body.reasoning || 'Test signal generated via API',
            source: 'Test'
        };

        const savedSignal = SignalManager.saveSignal(testSignal);

        // Broadcast to clients
        if (io) {
            io.emit('new-signal', savedSignal);
        }

        res.json({
            success: true,
            message: 'Test signal created and broadcasted',
            signal: savedSignal
        });

    } catch (error) {
        console.error('Test signal error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create test signal'
        });
    }
});

module.exports = { router, setIO };
