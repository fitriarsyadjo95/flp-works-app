/**
 * Post Manager
 * Handles all community post operations with database persistence
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class PostManager {
    constructor() {
        // Initialize database connection
        const dbPath = path.join(__dirname, '..', 'posts.db');
        this.db = new Database(dbPath);

        // Enable WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        this.initializeDatabase();
        console.log('✓ Post Manager initialized with database:', dbPath);
    }

    initializeDatabase() {
        // Create posts table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                media_url TEXT,
                media_type TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_pinned INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0
            )
        `);

        // Create reactions table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS reactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                reaction_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                UNIQUE(post_id, user_id, reaction_type)
            )
        `);

        // Create post views table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS post_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                UNIQUE(post_id, user_id)
            )
        `);

        // Create indices for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(is_pinned DESC, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
            CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
        `);

        console.log('✓ Post database schema initialized');
    }

    /**
     * Create a new post
     */
    createPost(content, mediaUrl = null, mediaType = null) {
        const stmt = this.db.prepare(`
            INSERT INTO posts (content, media_url, media_type)
            VALUES (?, ?, ?)
        `);

        const info = stmt.run(content, mediaUrl, mediaType);

        return {
            id: info.lastInsertRowid,
            content,
            media_url: mediaUrl,
            media_type: mediaType,
            created_at: new Date().toISOString(),
            is_pinned: false,
            view_count: 0,
            reactions: {}
        };
    }

    /**
     * Get posts feed with pagination
     */
    getFeed(limit = 20, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT
                p.*,
                (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as total_reactions
            FROM posts p
            ORDER BY
                p.is_pinned DESC,
                p.created_at DESC
            LIMIT ? OFFSET ?
        `);

        const posts = stmt.all(limit, offset);

        // Get reaction breakdown for each post
        return posts.map(post => {
            const reactions = this.getPostReactions(post.id);
            return {
                ...post,
                reactions,
                is_pinned: Boolean(post.is_pinned)
            };
        });
    }

    /**
     * Get a single post by ID
     */
    getPostById(postId) {
        const stmt = this.db.prepare(`
            SELECT * FROM posts WHERE id = ?
        `);

        const post = stmt.get(postId);
        if (!post) return null;

        const reactions = this.getPostReactions(postId);

        return {
            ...post,
            reactions,
            is_pinned: Boolean(post.is_pinned)
        };
    }

    /**
     * Get reaction breakdown for a post
     */
    getPostReactions(postId) {
        const stmt = this.db.prepare(`
            SELECT
                reaction_type,
                COUNT(*) as count
            FROM reactions
            WHERE post_id = ?
            GROUP BY reaction_type
        `);

        const reactions = stmt.all(postId);

        // Convert to object format
        const reactionMap = {};
        reactions.forEach(r => {
            reactionMap[r.reaction_type] = r.count;
        });

        return reactionMap;
    }

    /**
     * Add a reaction to a post
     */
    addReaction(postId, userId, reactionType) {
        const validReactions = ['like', 'heart', 'fire', 'gem', 'chart'];
        if (!validReactions.includes(reactionType)) {
            throw new Error('Invalid reaction type');
        }

        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO reactions (post_id, user_id, reaction_type)
            VALUES (?, ?, ?)
        `);

        const info = stmt.run(postId, userId, reactionType);

        return {
            success: info.changes > 0,
            reactions: this.getPostReactions(postId)
        };
    }

    /**
     * Remove a reaction from a post
     */
    removeReaction(postId, userId, reactionType) {
        const stmt = this.db.prepare(`
            DELETE FROM reactions
            WHERE post_id = ? AND user_id = ? AND reaction_type = ?
        `);

        const info = stmt.run(postId, userId, reactionType);

        return {
            success: info.changes > 0,
            reactions: this.getPostReactions(postId)
        };
    }

    /**
     * Get user's reactions for a post
     */
    getUserReactions(postId, userId) {
        const stmt = this.db.prepare(`
            SELECT reaction_type
            FROM reactions
            WHERE post_id = ? AND user_id = ?
        `);

        return stmt.all(postId, userId).map(r => r.reaction_type);
    }

    /**
     * Record a post view
     */
    recordView(postId, userId) {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO post_views (post_id, user_id)
            VALUES (?, ?)
        `);

        const info = stmt.run(postId, userId);

        if (info.changes > 0) {
            // Update view count
            this.db.prepare(`
                UPDATE posts
                SET view_count = view_count + 1
                WHERE id = ?
            `).run(postId);
        }

        return info.changes > 0;
    }

    /**
     * Update a post
     */
    updatePost(postId, content, mediaUrl = null, mediaType = null) {
        const stmt = this.db.prepare(`
            UPDATE posts
            SET content = ?, media_url = ?, media_type = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        const info = stmt.run(content, mediaUrl, mediaType, postId);

        return info.changes > 0;
    }

    /**
     * Toggle pin status
     */
    togglePin(postId) {
        const stmt = this.db.prepare(`
            UPDATE posts
            SET is_pinned = NOT is_pinned
            WHERE id = ?
        `);

        const info = stmt.run(postId);

        if (info.changes > 0) {
            const post = this.getPostById(postId);
            return post;
        }

        return null;
    }

    /**
     * Delete a post
     */
    deletePost(postId) {
        const stmt = this.db.prepare(`
            DELETE FROM posts WHERE id = ?
        `);

        const info = stmt.run(postId);
        return info.changes > 0;
    }

    /**
     * Get post statistics
     */
    getPostStats(postId) {
        const post = this.getPostById(postId);
        if (!post) return null;

        const reactionStmt = this.db.prepare(`
            SELECT COUNT(*) as total FROM reactions WHERE post_id = ?
        `);

        const viewStmt = this.db.prepare(`
            SELECT COUNT(*) as total FROM post_views WHERE post_id = ?
        `);

        const totalReactions = reactionStmt.get(postId).total;
        const uniqueViews = viewStmt.get(postId).total;

        return {
            post_id: postId,
            view_count: post.view_count,
            unique_views: uniqueViews,
            total_reactions: totalReactions,
            reactions_breakdown: post.reactions,
            created_at: post.created_at,
            updated_at: post.updated_at
        };
    }

    /**
     * Get total post count
     */
    getTotalPostCount() {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM posts`);
        return stmt.get().count;
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: function() {
        if (!instance) {
            instance = new PostManager();
        }
        return instance;
    },
    PostManager
};
