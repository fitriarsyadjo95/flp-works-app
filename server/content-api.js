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

        res.json({
            success: true,
            stats: {
                saved: savedCount
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

/**
 * Update user profile
 * PUT /api/content/user/update
 */
router.put('/user/update', extractUserId, (req, res) => {
    try {
        const { userId } = req;
        const { fullName, username, email, phone } = req.body;

        // Update user in database
        const updatedUser = ContentManager.updateUser(userId, {
            full_name: fullName,
            username: username,
            email: email,
            phone: phone
        });

        if (updatedUser) {
            res.json({
                success: true,
                message: 'Profile updated successfully',
                user: updatedUser
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            message: error.message
        });
    }
});

/**
 * Change user password
 * PUT /api/content/user/change-password
 */
router.put('/user/change-password', extractUserId, async (req, res) => {
    try {
        const { userId } = req;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters'
            });
        }

        // Get user from database
        const user = ContentManager.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // For demo purposes, we'll skip password verification since we don't have bcrypt set up
        // In production, you would verify the current password here
        // const bcrypt = require('bcrypt');
        // const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        // if (!isValid) {
        //     return res.status(401).json({
        //         success: false,
        //         error: 'Current password is incorrect'
        //     });
        // }

        // Hash the new password (for demo, we'll just store it as-is)
        // In production: const hashedPassword = await bcrypt.hash(newPassword, 10);
        const hashedPassword = newPassword; // Demo only - DO NOT do this in production

        // Update password in database
        ContentManager.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to change password',
            message: error.message
        });
    }
});

/**
 * Update watch history
 * POST /api/content/user/watch-history
 */
router.post('/user/watch-history', extractUserId, (req, res) => {
    try {
        const { userId } = req;
        const { courseId, watchStatus, progressPercent } = req.body;

        if (!courseId || !watchStatus) {
            return res.status(400).json({
                success: false,
                error: 'Course ID and watch status are required'
            });
        }

        // Check if history exists
        const existing = ContentManager.db.prepare(`
            SELECT * FROM watch_history WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        const now = new Date().toISOString();

        if (existing) {
            // Update existing history
            const updateFields = [];
            const updateValues = [];

            updateFields.push('watch_status = ?');
            updateValues.push(watchStatus);

            if (progressPercent !== undefined) {
                updateFields.push('progress_percent = ?');
                updateValues.push(progressPercent);
            }

            updateFields.push('last_watched_at = ?');
            updateValues.push(now);

            if (watchStatus === 'finished' && !existing.completed_at) {
                updateFields.push('completed_at = ?');
                updateValues.push(now);
            }

            updateValues.push(userId, courseId);

            ContentManager.db.prepare(`
                UPDATE watch_history
                SET ${updateFields.join(', ')}
                WHERE user_id = ? AND course_id = ?
            `).run(...updateValues);
        } else {
            // Create new history
            const id = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            ContentManager.db.prepare(`
                INSERT INTO watch_history (
                    id, user_id, course_id, watch_status, progress_percent,
                    first_watched_at, last_watched_at, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                id,
                userId,
                courseId,
                watchStatus,
                progressPercent || 0,
                now,
                now,
                watchStatus === 'finished' ? now : null
            );
        }

        res.json({
            success: true,
            message: 'Watch history updated successfully'
        });
    } catch (error) {
        console.error('Update watch history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update watch history',
            message: error.message
        });
    }
});

/**
 * Get courses with watch status
 * GET /api/content/user/courses-with-status
 */
router.get('/user/courses-with-status', extractUserId, (req, res) => {
    try {
        const { userId } = req;
        const { watchStatus } = req.query;

        let query = `
            SELECT
                c.*,
                wh.watch_status,
                wh.progress_percent,
                wh.last_watched_at,
                wh.completed_at,
                CASE WHEN sc.id IS NOT NULL THEN 1 ELSE 0 END as is_saved
            FROM courses c
            LEFT JOIN watch_history wh ON c.id = wh.course_id AND wh.user_id = ?
            LEFT JOIN saved_content sc ON c.id = sc.course_id AND sc.user_id = ?
            WHERE c.is_published = 1
        `;

        const params = [userId, userId];

        // Filter by watch status if specified
        if (watchStatus && watchStatus !== 'all') {
            if (watchStatus === 'not-watched') {
                query += ` AND (wh.watch_status IS NULL OR wh.watch_status = 'not-watched')`;
            } else {
                query += ` AND wh.watch_status = ?`;
                params.push(watchStatus);
            }
        }

        query += ` ORDER BY c.created_at DESC`;

        const courses = ContentManager.db.prepare(query).all(...params);

        // Add default watch_status for courses without history
        const coursesWithStatus = courses.map(course => ({
            ...course,
            watch_status: course.watch_status || 'not-watched',
            progress_percent: course.progress_percent || 0,
            is_saved: course.is_saved === 1
        }));

        res.json({
            success: true,
            courses: coursesWithStatus,
            total: coursesWithStatus.length
        });
    } catch (error) {
        console.error('Get courses with status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get courses',
            message: error.message
        });
    }
});

/**
 * Forgot password - Send reset link
 * POST /api/content/user/forgot-password
 */
router.post('/user/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user exists
        const user = ContentManager.db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        // Always return success for security (don't reveal if email exists)
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists with this email, a password reset link has been sent'
            });
        }

        // Generate reset token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const tokenId = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Token expires in 1 hour
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        // Save token to database
        ContentManager.db.prepare(`
            INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `).run(tokenId, user.id, token, expiresAt);

        // In production, send email with reset link
        // For now, we'll log it to console for demo purposes
        const resetLink = `http://localhost:5001/reset-password.html?token=${token}`;
        console.log('\n=== PASSWORD RESET LINK ===');
        console.log(`Email: ${email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log(`Expires in: 1 hour`);
        console.log('===========================\n');

        // TODO: Send email using email service
        // await sendPasswordResetEmail(email, resetLink);

        res.json({
            success: true,
            message: 'Password reset link sent successfully',
            // For demo only - remove in production
            resetLink: resetLink
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request',
            error: error.message
        });
    }
});

/**
 * Reset password with token
 * POST /api/content/user/reset-password
 */
router.post('/user/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        // Find token in database
        const resetToken = ContentManager.db.prepare(`
            SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0
        `).get(token);

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(resetToken.expires_at);

        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired. Please request a new one.'
            });
        }

        // Hash the new password (for demo, storing as-is)
        // In production: const hashedPassword = await bcrypt.hash(newPassword, 10);
        const hashedPassword = newPassword;

        // Update user password
        ContentManager.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
            .run(hashedPassword, resetToken.user_id);

        // Mark token as used
        ContentManager.db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
            .run(resetToken.id);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
});

// ==================== USER REGISTRATION ====================

/**
 * User Registration
 * POST /api/content/user/register
 */
router.post('/user/register', async (req, res) => {
    try {
        const { email, password, username, fullName, phone, experience } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters'
            });
        }

        // Check if user already exists
        const existingUser = ContentManager.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create user
        const { v4: uuidv4 } = require('uuid');
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');

        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);
        const referralCode = `FLP${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

        ContentManager.db.prepare(`
            INSERT INTO users (id, email, password_hash, username, full_name, phone, referral_code, is_premium, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
        `).run(userId, email, passwordHash, username || email.split('@')[0], fullName || '', phone || '', referralCode);

        const user = ContentManager.db.prepare('SELECT id, email, username, full_name, phone, is_premium, referral_code, created_at FROM users WHERE id = ?').get(userId);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '30d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.full_name,
                phone: user.phone,
                isPremium: user.is_premium === 1,
                referralCode: user.referral_code,
                createdAt: user.created_at
            },
            token
        });
    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register user',
            error: error.message
        });
    }
});

/**
 * User Login
 * POST /api/content/user/login
 */
router.post('/user/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = ContentManager.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const bcrypt = require('bcrypt');
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        ContentManager.db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key-change-in-production',
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullName: user.full_name,
                phone: user.phone,
                isPremium: user.is_premium === 1,
                referralCode: user.referral_code
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to login',
            error: error.message
        });
    }
});

// ==================== COURSE PROGRESS TRACKING ====================

/**
 * Update Course Progress
 * POST /api/content/user/progress/:courseId
 */
router.post('/user/progress/:courseId', extractUserId, (req, res) => {
    try {
        const { userId } = req;
        const { courseId } = req.params;
        const { progress_percent, completed } = req.body;

        const { v4: uuidv4 } = require('uuid');
        const now = new Date().toISOString();

        // Check if progress exists
        const existing = ContentManager.db.prepare(`
            SELECT * FROM course_progress WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        if (existing) {
            // Update existing progress
            ContentManager.db.prepare(`
                UPDATE course_progress
                SET progress_percent = ?,
                    completed = ?,
                    last_watched = ?,
                    completed_at = ?
                WHERE user_id = ? AND course_id = ?
            `).run(
                progress_percent || 0,
                completed ? 1 : 0,
                now,
                completed ? now : existing.completed_at,
                userId,
                courseId
            );
        } else {
            // Create new progress
            ContentManager.db.prepare(`
                INSERT INTO course_progress (id, user_id, course_id, progress_percent, completed, first_watched, last_watched, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(),
                userId,
                courseId,
                progress_percent || 0,
                completed ? 1 : 0,
                now,
                now,
                completed ? now : null
            );
        }

        res.json({
            success: true,
            message: 'Progress updated successfully'
        });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update progress',
            error: error.message
        });
    }
});

/**
 * Get Single Course Progress
 * GET /api/content/user/progress/:courseId
 */
router.get('/user/progress/:courseId', extractUserId, (req, res) => {
    try {
        const { userId } = req;
        const { courseId } = req.params;

        const progress = ContentManager.db.prepare(`
            SELECT progress_percent, completed, first_watched, last_watched, completed_at
            FROM course_progress
            WHERE user_id = ? AND course_id = ?
        `).get(userId, courseId);

        if (!progress) {
            return res.json({
                success: true,
                progress: {
                    progress_percent: 0,
                    completed: false
                }
            });
        }

        res.json({
            success: true,
            progress: {
                progress_percent: progress.progress_percent,
                completed: progress.completed === 1,
                first_watched: progress.first_watched,
                last_watched: progress.last_watched,
                completed_at: progress.completed_at
            }
        });
    } catch (error) {
        console.error('Get course progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get progress',
            error: error.message
        });
    }
});

/**
 * Get All Course Progress
 * GET /api/content/user/progress
 */
router.get('/user/progress', extractUserId, (req, res) => {
    try {
        const { userId } = req;

        const progressList = ContentManager.db.prepare(`
            SELECT cp.*, c.title
            FROM course_progress cp
            JOIN courses c ON cp.course_id = c.id
            WHERE cp.user_id = ?
            ORDER BY cp.last_watched DESC
        `).all(userId);

        const history = progressList.map(p => ({
            course_id: p.course_id,
            title: p.title,
            progress_percent: p.progress_percent,
            completed: p.completed === 1,
            first_watched: p.first_watched,
            last_watched: p.last_watched,
            completed_at: p.completed_at
        }));

        res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error('Get progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get progress',
            error: error.message
        });
    }
});

// ==================== HOME PAGE DYNAMIC CONTENT ====================

/**
 * Get Featured Courses
 * GET /api/content/courses/featured
 */
router.get('/courses/featured', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;

        // Get courses marked as featured or most viewed
        const courses = ContentManager.db.prepare(`
            SELECT * FROM courses
            WHERE is_published = 1
            ORDER BY views DESC, created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error('Get featured courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get featured courses',
            error: error.message
        });
    }
});

/**
 * Get Recent Courses
 * GET /api/content/courses/recent
 */
router.get('/courses/recent', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const courses = ContentManager.db.prepare(`
            SELECT * FROM courses
            WHERE is_published = 1
            ORDER BY created_at DESC
            LIMIT ?
        `).all(limit);

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        console.error('Get recent courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent courses',
            error: error.message
        });
    }
});

module.exports = router;
