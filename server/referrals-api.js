/**
 * Referrals API Routes
 * Handles referral code generation, tracking, and rewards
 */

const express = require('express');
const router = express.Router();
const ContentManager = require('./content-manager');
const { extractUserId } = require('./content-api');

// Create referrals table if not exists
ContentManager.db.prepare(`
    CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        referred_user_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reward_granted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        upgraded_at TEXT,
        UNIQUE(referred_user_id)
    )
`).run();

/**
 * GET /api/referrals/stats
 * Get referral statistics for the current user
 */
router.get('/stats', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        // Get total referrals count
        const totalReferrals = ContentManager.db.prepare(`
            SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?
        `).get(userId);

        // Get active referrals (users who are premium)
        const activeReferrals = ContentManager.db.prepare(`
            SELECT COUNT(*) as count FROM referrals r
            INNER JOIN users u ON r.referred_user_id = u.id
            WHERE r.referrer_id = ? AND u.is_premium = 1
        `).get(userId);

        // Calculate rewards earned (7 days per active referral)
        const rewardDays = (activeReferrals?.count || 0) * 7;

        res.json({
            success: true,
            stats: {
                total_referrals: totalReferrals?.count || 0,
                active_referrals: activeReferrals?.count || 0,
                rewards_earned: rewardDays > 0 ? `${rewardDays} days` : "0 days"
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get referral stats',
            message: error.message
        });
    }
});

/**
 * GET /api/referrals/list
 * Get list of referred users
 */
router.get('/list', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        const referrals = ContentManager.db.prepare(`
            SELECT
                u.id,
                COALESCE(u.full_name, u.email) as name,
                u.email,
                u.is_premium as is_premium,
                r.created_at as joined_date
            FROM referrals r
            INNER JOIN users u ON r.referred_user_id = u.id
            WHERE r.referrer_id = ?
            ORDER BY r.created_at DESC
        `).all(userId);

        // Format dates
        const formattedReferrals = referrals.map(ref => ({
            ...ref,
            joined_date: formatDate(ref.joined_date),
            is_premium: ref.is_premium === 1
        }));

        res.json({
            success: true,
            referrals: formattedReferrals
        });
    } catch (error) {
        console.error('Get referrals list error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get referrals list',
            message: error.message
        });
    }
});

// Helper function to format dates
function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
}

module.exports = router;
