/**
 * Content API Routes
 * Handles courses, users, and notifications management
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('./admin-auth');
const ContentManager = require('./content-manager');

// ==================== COURSES ====================

/**
 * Get all published courses (PUBLIC - no auth required)
 * GET /api/content/courses/public
 */
router.get('/courses/public', (req, res) => {
    try {
        const { category, difficulty, limit } = req.query;

        const courses = ContentManager.getCourses({
            category,
            difficulty,
            is_published: 1, // Only published courses
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error('Get public courses error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve courses',
            message: error.message
        });
    }
});

/**
 * Get single published course (PUBLIC - no auth required)
 * GET /api/content/courses/public/:id
 */
router.get('/courses/public/:id', (req, res) => {
    try {
        const course = ContentManager.getCourseById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Only return if published
        if (course.is_published !== 1) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Get public course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve course',
            message: error.message
        });
    }
});

/**
 * Get all courses (ADMIN only)
 * GET /api/content/courses
 */
router.get('/courses', adminAuth.requireAuth(), (req, res) => {
    try {
        const { category, difficulty, is_published, limit } = req.query;

        const courses = ContentManager.getCourses({
            category,
            difficulty,
            is_published: is_published !== undefined ? parseInt(is_published) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve courses',
            message: error.message
        });
    }
});

/**
 * Get single course (ADMIN only)
 * GET /api/content/courses/:id
 */
router.get('/courses/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const course = ContentManager.getCourseById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve course',
            message: error.message
        });
    }
});

/**
 * Create new course
 * POST /api/content/courses
 */
router.post('/courses', adminAuth.requireAuth(), (req, res) => {
    try {
        const { title, description, thumbnail_url, video_url, duration, category, tags, difficulty, is_published, order_index } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        const course = ContentManager.createCourse({
            title,
            description,
            thumbnail_url,
            video_url,
            duration,
            category,
            tags,
            difficulty,
            is_published,
            order_index
        });

        console.log(`✓ Course created by admin "${req.admin.username}"`);

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            course
        });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create course',
            message: error.message
        });
    }
});

/**
 * Update course
 * PATCH /api/content/courses/:id
 */
router.patch('/courses/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const course = ContentManager.updateCourse(req.params.id, req.body);

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        console.log(`✓ Course updated by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'Course updated successfully',
            course
        });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update course',
            message: error.message
        });
    }
});

/**
 * Delete course
 * DELETE /api/content/courses/:id
 */
router.delete('/courses/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const result = ContentManager.deleteCourse(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        console.log(`✓ Course deleted by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete course',
            message: error.message
        });
    }
});

// ==================== USERS ====================

/**
 * Get all users
 * GET /api/content/users
 */
router.get('/users', adminAuth.requireAuth(), (req, res) => {
    try {
        const { is_premium, limit } = req.query;

        const users = ContentManager.getUsers({
            is_premium: is_premium !== undefined ? parseInt(is_premium) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });

        const stats = ContentManager.getUserStats();

        res.json({
            success: true,
            count: users.length,
            stats,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users',
            message: error.message
        });
    }
});

/**
 * Get single user
 * GET /api/content/users/:id
 */
router.get('/users/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const user = ContentManager.getUserById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user',
            message: error.message
        });
    }
});

/**
 * Update user
 * PATCH /api/content/users/:id
 */
router.patch('/users/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const user = ContentManager.updateUser(req.params.id, req.body);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log(`✓ User updated by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            message: error.message
        });
    }
});

/**
 * Delete user
 * DELETE /api/content/users/:id
 */
router.delete('/users/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const result = ContentManager.deleteUser(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log(`✓ User deleted by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            message: error.message
        });
    }
});

// ==================== NOTIFICATIONS ====================

/**
 * Get all notifications
 * GET /api/content/notifications
 */
router.get('/notifications', adminAuth.requireAuth(), (req, res) => {
    try {
        const { type, is_global, limit } = req.query;

        const notifications = ContentManager.getNotifications({
            type,
            is_global: is_global !== undefined ? parseInt(is_global) : undefined,
            limit: limit ? parseInt(limit) : undefined
        });

        res.json({
            success: true,
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve notifications',
            message: error.message
        });
    }
});

/**
 * Create notification
 * POST /api/content/notifications
 */
router.post('/notifications', adminAuth.requireAuth(), (req, res) => {
    try {
        const { title, message, type, icon, action_url, is_global, user_id } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Title and message are required'
            });
        }

        const notification = ContentManager.createNotification({
            title,
            message,
            type,
            icon,
            action_url,
            is_global,
            user_id
        });

        // Broadcast via WebSocket if available
        if (global.io) {
            if (is_global) {
                global.io.emit('notification', notification);
            } else if (user_id) {
                global.io.to(user_id).emit('notification', notification);
            }
        }

        console.log(`✓ Notification created by admin "${req.admin.username}"`);

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            notification
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create notification',
            message: error.message
        });
    }
});

/**
 * Delete notification
 * DELETE /api/content/notifications/:id
 */
router.delete('/notifications/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const result = ContentManager.deleteNotification(req.params.id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found'
            });
        }

        console.log(`✓ Notification deleted by admin "${req.admin.username}"`);

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete notification',
            message: error.message
        });
    }
});

// ==================== STATISTICS ====================

/**
 * Get content statistics
 * GET /api/content/stats
 */
router.get('/stats', adminAuth.requireAuth(), (req, res) => {
    try {
        const stats = ContentManager.getContentStats();
        const userStats = ContentManager.getUserStats();

        res.json({
            success: true,
            stats: {
                ...stats,
                ...userStats
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics',
            message: error.message
        });
    }
});

// ==================== CATEGORIES ====================

/**
 * Get all categories (PUBLIC)
 * GET /api/content/categories/public
 */
router.get('/categories/public', (req, res) => {
    try {
        const categories = ContentManager.getCategories();
        res.json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve categories',
            message: error.message
        });
    }
});

/**
 * Get all categories (ADMIN)
 * GET /api/content/categories
 */
router.get('/categories', adminAuth.requireAuth(), (req, res) => {
    try {
        const categories = ContentManager.getCategories();
        res.json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve categories',
            message: error.message
        });
    }
});

/**
 * Get category statistics
 * GET /api/content/categories/stats
 */
router.get('/categories/stats', adminAuth.requireAuth(), (req, res) => {
    try {
        const stats = ContentManager.getCategoryStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get category stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve category statistics',
            message: error.message
        });
    }
});

/**
 * Get single category
 * GET /api/content/categories/:id
 */
router.get('/categories/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const category = ContentManager.getCategoryById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve category',
            message: error.message
        });
    }
});

/**
 * Create new category
 * POST /api/content/categories
 */
router.post('/categories', adminAuth.requireAuth(), (req, res) => {
    try {
        const { name, description, color, icon, order_index } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Category name is required'
            });
        }

        // Check if category name already exists
        const existing = ContentManager.getCategoryByName(name);
        if (existing) {
            return res.status(400).json({
                success: false,
                error: 'Category name already exists'
            });
        }

        const category = ContentManager.createCategory({
            name,
            description,
            color,
            icon,
            order_index
        });

        res.status(201).json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create category',
            message: error.message
        });
    }
});

/**
 * Update category
 * PATCH /api/content/categories/:id
 */
router.patch('/categories/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const { name, description, color, icon, order_index } = req.body;

        // If updating name, check for duplicates
        if (name) {
            const existing = ContentManager.getCategoryByName(name);
            if (existing && existing.id !== req.params.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Category name already exists'
                });
            }
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (color !== undefined) updates.color = color;
        if (icon !== undefined) updates.icon = icon;
        if (order_index !== undefined) updates.order_index = parseInt(order_index);

        const category = ContentManager.updateCategory(req.params.id, updates);

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update category',
            message: error.message
        });
    }
});

/**
 * Delete category
 * DELETE /api/content/categories/:id
 */
router.delete('/categories/:id', adminAuth.requireAuth(), (req, res) => {
    try {
        const deleted = ContentManager.deleteCategory(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete category',
            message: error.message
        });
    }
});

// ==================== USER SAVED CONTENT & PROGRESS ====================

/**
 * Middleware to extract user ID from request
 * For now, uses simple user identification - can be enhanced with JWT later
 */
function extractUserId(req, res, next) {
    // Try multiple methods to get user ID
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('User ')) {
        req.userId = authHeader.replace('User ', '');
    } else {
        // Try to get from localStorage-style header
        const userHeader = req.headers['x-user-id'];
        if (userHeader) {
            req.userId = userHeader;
        } else {
            // Generate anonymous user ID from IP
            const ip = req.ip || req.connection.remoteAddress;
            req.userId = `anon_${Buffer.from(ip).toString('base64').substring(0, 16)}`;
        }
    }
    next();
}

/**
 * Save/Unsave course (Watch Later)
 * POST /api/content/user/saved/:courseId
 */
router.post('/user/saved/:courseId', extractUserId, (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req;

        // Check if already saved
        const existing = ContentManager.db.prepare(`
            SELECT * FROM saved_content WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        if (existing) {
            return res.json({
                success: false,
                message: 'Already saved',
                saved: true
            });
        }

        // Save the course
        const id = `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        ContentManager.db.prepare(`
            INSERT INTO saved_content (id, user_id, course_id, saved_at)
            VALUES (?, ?, ?, datetime('now'))
        `).run(id, userId, courseId);

        res.json({
            success: true,
            message: 'Course saved successfully',
            saved: true
        });
    } catch (error) {
        console.error('Save course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save course',
            message: error.message
        });
    }
});

/**
 * Remove from saved (Watch Later)
 * DELETE /api/content/user/saved/:courseId
 */
router.delete('/user/saved/:courseId', extractUserId, (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req;

        ContentManager.db.prepare(`
            DELETE FROM saved_content WHERE user_id = ? AND course_id = ?
        `).run(userId, courseId);

        res.json({
            success: true,
            message: 'Course removed from saved',
            saved: false
        });
    } catch (error) {
        console.error('Unsave course error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to unsave course',
            message: error.message
        });
    }
});

/**
 * Get all saved courses
 * GET /api/content/user/saved
 */
router.get('/user/saved', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        const savedCourses = ContentManager.db.prepare(`
            SELECT
                c.*,
                sc.saved_at
            FROM saved_content sc
            JOIN courses c ON sc.course_id = c.id
            WHERE sc.user_id = ?
            ORDER BY sc.saved_at DESC
        `).all(userId);

        res.json({
            success: true,
            count: savedCourses.length,
            courses: savedCourses
        });
    } catch (error) {
        console.error('Get saved courses error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get saved courses',
            message: error.message
        });
    }
});

/**
 * Check if course is saved
 * GET /api/content/user/saved/:courseId/check
 */
router.get('/user/saved/:courseId/check', extractUserId, (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req;

        const saved = ContentManager.db.prepare(`
            SELECT * FROM saved_content WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        res.json({
            success: true,
            saved: !!saved
        });
    } catch (error) {
        console.error('Check saved error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check saved status',
            message: error.message
        });
    }
});

/**
 * Update course progress
 * POST /api/content/user/progress/:courseId
 */
router.post('/user/progress/:courseId', extractUserId, (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req;
        const { progress_percent, completed } = req.body;

        // Check if progress exists
        const existing = ContentManager.db.prepare(`
            SELECT * FROM user_progress WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        if (existing) {
            // Update existing progress
            ContentManager.db.prepare(`
                UPDATE user_progress
                SET progress_percent = ?,
                    completed = ?,
                    last_watched = datetime('now')
                WHERE user_id = ? AND course_id = ?
            `).run(progress_percent || 0, completed ? 1 : 0, userId, courseId);
        } else {
            // Create new progress
            const id = `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            ContentManager.db.prepare(`
                INSERT INTO user_progress (id, user_id, course_id, progress_percent, completed, last_watched)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
            `).run(id, userId, courseId, progress_percent || 0, completed ? 1 : 0);
        }

        res.json({
            success: true,
            message: 'Progress updated successfully'
        });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update progress',
            message: error.message
        });
    }
});

/**
 * Get course progress
 * GET /api/content/user/progress/:courseId
 */
router.get('/user/progress/:courseId', extractUserId, (req, res) => {
    try {
        const { courseId } = req.params;
        const { userId } = req;

        const progress = ContentManager.db.prepare(`
            SELECT * FROM user_progress WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        res.json({
            success: true,
            progress: progress || {
                progress_percent: 0,
                completed: false
            }
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get progress',
            message: error.message
        });
    }
});

/**
 * Get all user progress (watch history)
 * GET /api/content/user/progress
 */
router.get('/user/progress', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        const progress = ContentManager.db.prepare(`
            SELECT
                up.*,
                c.title,
                c.description,
                c.thumbnail_url,
                c.duration,
                c.category
            FROM user_progress up
            JOIN courses c ON up.course_id = c.id
            WHERE up.user_id = ?
            ORDER BY up.last_watched DESC
        `).all(userId);

        const completed = progress.filter(p => p.completed);
        const inProgress = progress.filter(p => !p.completed && p.progress_percent > 0);

        res.json({
            success: true,
            total: progress.length,
            completed: completed.length,
            inProgress: inProgress.length,
            history: progress
        });
    } catch (error) {
        console.error('Get progress history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get progress history',
            message: error.message
        });
    }
});

/**
 * Get user statistics
 * GET /api/content/user/stats
 */
router.get('/user/stats', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        // Get saved count
        const savedCount = ContentManager.db.prepare(`
            SELECT COUNT(*) as count FROM saved_content WHERE user_id = ?
        `).get(userId).count;

        // Get completed count
        const completedCount = ContentManager.db.prepare(`
            SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND completed = 1
        `).get(userId).count;

        // Get in progress count
        const inProgressCount = ContentManager.db.prepare(`
            SELECT COUNT(*) as count FROM user_progress
            WHERE user_id = ? AND completed = 0 AND progress_percent > 0
        `).get(userId).count;

        // Get average progress
        const avgProgress = ContentManager.db.prepare(`
            SELECT AVG(progress_percent) as avg FROM user_progress WHERE user_id = ?
        `).get(userId).avg || 0;

        res.json({
            success: true,
            stats: {
                saved: savedCount,
                completed: completedCount,
                inProgress: inProgressCount,
                averageProgress: Math.round(avgProgress)
            }
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user stats',
            message: error.message
        });
    }
});

module.exports = router;
