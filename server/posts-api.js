/**
 * Posts API Routes
 * Handles community post operations
 */

const express = require('express');
const router = express.Router();
const { getInstance: getPostManager } = require('./post-manager');
const adminAuth = require('./admin-auth');

// Socket.IO instance (will be set by server.js)
let io = null;

/**
 * Set Socket.IO instance for real-time updates
 */
function setIO(socketIO) {
    io = socketIO;
    console.log('✓ Posts API: Socket.IO configured');
}

/**
 * Middleware to verify admin authentication
 */
function requireAdmin(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }

    const session = adminAuth.validateSession(token);

    if (!session) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired session'
        });
    }

    req.admin = session;
    next();
}

/**
 * Middleware to extract user ID from request
 */
function extractUserId(req, res, next) {
    // Try to get user ID from authorization header or use a default
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('User ')) {
        req.userId = authHeader.replace('User ', '');
    } else {
        // Generate anonymous user ID from IP and user agent
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'unknown';
        req.userId = `anon_${Buffer.from(ip + userAgent).toString('base64').substring(0, 16)}`;
    }

    next();
}

/**
 * CREATE POST - Admin only
 * POST /api/posts/create
 */
router.post('/create', requireAdmin, async (req, res) => {
    try {
        const { content, mediaUrl, mediaType } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }

        const postManager = getPostManager();
        const post = postManager.createPost(content, mediaUrl, mediaType);

        // Broadcast new post to all connected clients
        if (io) {
            io.emit('new-post', post);
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create post',
            message: error.message
        });
    }
});

/**
 * GET POSTS FEED
 * GET /api/posts/feed?limit=20&offset=0
 */
router.get('/feed', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        if (limit > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit cannot exceed 100'
            });
        }

        const postManager = getPostManager();
        const posts = postManager.getFeed(limit, offset);
        const totalCount = postManager.getTotalPostCount();

        res.json({
            success: true,
            posts,
            pagination: {
                limit,
                offset,
                total: totalCount,
                hasMore: offset + limit < totalCount
            }
        });
    } catch (error) {
        console.error('Get feed error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch posts',
            message: error.message
        });
    }
});

/**
 * GET SINGLE POST
 * GET /api/posts/:id
 */
router.get('/:id', (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const post = postManager.getPostById(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch post',
            message: error.message
        });
    }
});

/**
 * ADD REACTION
 * POST /api/posts/:id/react
 */
router.post('/:id/react', extractUserId, (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { reactionType } = req.body;

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        if (!reactionType) {
            return res.status(400).json({
                success: false,
                error: 'Reaction type is required'
            });
        }

        const postManager = getPostManager();
        const result = postManager.addReaction(postId, req.userId, reactionType);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Reaction already exists'
            });
        }

        // Broadcast reaction update
        if (io) {
            io.emit('post-reaction', {
                postId,
                reactions: result.reactions
            });
        }

        res.json({
            success: true,
            reactions: result.reactions
        });
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add reaction',
            message: error.message
        });
    }
});

/**
 * REMOVE REACTION
 * DELETE /api/posts/:id/react
 */
router.delete('/:id/react', extractUserId, (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { reactionType } = req.body;

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        if (!reactionType) {
            return res.status(400).json({
                success: false,
                error: 'Reaction type is required'
            });
        }

        const postManager = getPostManager();
        const result = postManager.removeReaction(postId, req.userId, reactionType);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: 'Reaction not found'
            });
        }

        // Broadcast reaction update
        if (io) {
            io.emit('post-reaction', {
                postId,
                reactions: result.reactions
            });
        }

        res.json({
            success: true,
            reactions: result.reactions
        });
    } catch (error) {
        console.error('Remove reaction error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove reaction',
            message: error.message
        });
    }
});

/**
 * RECORD VIEW
 * POST /api/posts/:id/view
 */
router.post('/:id/view', extractUserId, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const recorded = postManager.recordView(postId, req.userId);

        res.json({
            success: true,
            recorded
        });
    } catch (error) {
        console.error('Record view error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record view',
            message: error.message
        });
    }
});

/**
 * GET USER REACTIONS FOR A POST
 * GET /api/posts/:id/my-reactions
 */
router.get('/:id/my-reactions', extractUserId, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const reactions = postManager.getUserReactions(postId, req.userId);

        res.json({
            success: true,
            reactions
        });
    } catch (error) {
        console.error('Get user reactions error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get reactions',
            message: error.message
        });
    }
});

/**
 * UPDATE POST - Admin only
 * PUT /api/posts/:id
 */
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const postId = parseInt(req.params.id);
        const { content, mediaUrl, mediaType } = req.body;

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Post content is required'
            });
        }

        const postManager = getPostManager();
        const updated = postManager.updatePost(postId, content, mediaUrl, mediaType);

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        const post = postManager.getPostById(postId);

        // Broadcast update
        if (io) {
            io.emit('post-updated', post);
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update post',
            message: error.message
        });
    }
});

/**
 * TOGGLE PIN - Admin only
 * PUT /api/posts/:id/pin
 */
router.put('/:id/pin', requireAdmin, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const post = postManager.togglePin(postId);

        if (!post) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Broadcast update
        if (io) {
            io.emit('post-updated', post);
        }

        res.json({
            success: true,
            post
        });
    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle pin',
            message: error.message
        });
    }
});

/**
 * DELETE POST - Admin only
 * DELETE /api/posts/:id
 */
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const deleted = postManager.deletePost(postId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        // Broadcast deletion
        if (io) {
            io.emit('post-deleted', { postId });
        }

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete post',
            message: error.message
        });
    }
});

/**
 * GET POST STATISTICS - Admin only
 * GET /api/posts/:id/stats
 */
router.get('/:id/stats', requireAdmin, (req, res) => {
    try {
        const postId = parseInt(req.params.id);

        if (isNaN(postId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid post ID'
            });
        }

        const postManager = getPostManager();
        const stats = postManager.getPostStats(postId);

        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Post not found'
            });
        }

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics',
            message: error.message
        });
    }
});

module.exports = { router, setIO };
