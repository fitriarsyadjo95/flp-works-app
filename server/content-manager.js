/**
 * Content Manager Module
 * Handles courses, videos, and educational content management
 */

const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class ContentManager {
    constructor() {
        // Use same database file as signals
        const dbPath = path.join(__dirname, '..', 'signals.db');
        this.db = new Database(dbPath);
        this.initDatabase();
        console.log('✓ Content Manager initialized');
    }

    /**
     * Initialize content database schema
     */
    initDatabase() {
        this.db.exec(`
            -- Categories table
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                color TEXT,
                icon TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Courses table
            CREATE TABLE IF NOT EXISTS courses (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                thumbnail_url TEXT,
                video_url TEXT,
                duration TEXT,
                category TEXT,
                tags TEXT,
                difficulty TEXT CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
                views INTEGER DEFAULT 0,
                is_published BOOLEAN DEFAULT 1,
                order_index INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT,
                password_hash TEXT,
                is_premium BOOLEAN DEFAULT 0,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT
            );

            -- Notifications table
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT CHECK(type IN ('signal', 'course', 'system', 'premium', 'referral')),
                icon TEXT,
                action_url TEXT,
                is_global BOOLEAN DEFAULT 0,
                user_id TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- User progress tracking
            CREATE TABLE IF NOT EXISTS user_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0,
                progress_percent INTEGER DEFAULT 0,
                last_watched TEXT,
                UNIQUE(user_id, course_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id)
            );

            -- Saved content
            CREATE TABLE IF NOT EXISTS saved_content (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                course_id TEXT NOT NULL,
                saved_at TEXT NOT NULL,
                UNIQUE(user_id, course_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id)
            );

            CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
            CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_global ON notifications(is_global);
        `);

        console.log('✓ Content database schema initialized');
    }

    // ==================== COURSES ====================

    /**
     * Create a new course
     */
    createCourse(courseData) {
        try {
            const course = {
                id: uuidv4(),
                title: courseData.title,
                description: courseData.description || null,
                thumbnail_url: courseData.thumbnail_url || null,
                video_url: courseData.video_url || null,
                duration: courseData.duration || null,
                category: courseData.category || 'General',
                tags: courseData.tags || null,
                difficulty: courseData.difficulty || 'Beginner',
                views: 0,
                is_published: courseData.is_published !== undefined ? courseData.is_published : 1,
                order_index: courseData.order_index || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const stmt = this.db.prepare(`
                INSERT INTO courses (
                    id, title, description, thumbnail_url, video_url, duration,
                    category, tags, difficulty, views, is_published, order_index,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                course.id, course.title, course.description, course.thumbnail_url,
                course.video_url, course.duration, course.category, course.tags,
                course.difficulty, course.views, course.is_published, course.order_index,
                course.created_at, course.updated_at
            );

            console.log(`✓ Course created: ${course.title}`);
            return course;

        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    }

    /**
     * Get all courses
     */
    getCourses(filters = {}) {
        try {
            let query = 'SELECT * FROM courses WHERE 1=1';
            const params = [];

            if (filters.category) {
                query += ' AND category = ?';
                params.push(filters.category);
            }

            if (filters.difficulty) {
                query += ' AND difficulty = ?';
                params.push(filters.difficulty);
            }

            if (filters.is_published !== undefined) {
                query += ' AND is_published = ?';
                params.push(filters.is_published);
            }

            query += ' ORDER BY order_index ASC, created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const stmt = this.db.prepare(query);
            return stmt.all(...params);

        } catch (error) {
            console.error('Error getting courses:', error);
            return [];
        }
    }

    /**
     * Get single course
     */
    getCourseById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM courses WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error getting course:', error);
            return null;
        }
    }

    /**
     * Update course
     */
    updateCourse(id, updates) {
        try {
            const course = this.getCourseById(id);
            if (!course) return null;

            const fields = [];
            const values = [];

            const allowedFields = [
                'title', 'description', 'thumbnail_url', 'video_url', 'duration',
                'category', 'tags', 'difficulty', 'is_published', 'order_index'
            ];

            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    values.push(updates[field]);
                }
            });

            if (fields.length === 0) return course;

            fields.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(id);

            const query = `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`;
            const stmt = this.db.prepare(query);
            stmt.run(...values);

            console.log(`✓ Course updated: ${id}`);
            return this.getCourseById(id);

        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    }

    /**
     * Delete course
     */
    deleteCourse(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM courses WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes > 0) {
                console.log(`✓ Course deleted: ${id}`);
                return true;
            }
            return false;

        } catch (error) {
            console.error('Error deleting course:', error);
            return false;
        }
    }

    /**
     * Increment course views
     */
    incrementViews(id) {
        try {
            const stmt = this.db.prepare('UPDATE courses SET views = views + 1 WHERE id = ?');
            stmt.run(id);
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    }

    // ==================== USERS ====================

    /**
     * Get all users
     */
    getUsers(filters = {}) {
        try {
            let query = 'SELECT id, email, username, is_premium, referral_code, referred_by, created_at, last_login FROM users WHERE 1=1';
            const params = [];

            if (filters.is_premium !== undefined) {
                query += ' AND is_premium = ?';
                params.push(filters.is_premium);
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const stmt = this.db.prepare(query);
            return stmt.all(...params);

        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    /**
     * Get user by ID
     */
    getUserById(id) {
        try {
            const stmt = this.db.prepare('SELECT id, email, username, is_premium, referral_code, referred_by, created_at, last_login FROM users WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Update user
     */
    updateUser(id, updates) {
        try {
            const fields = [];
            const values = [];

            const allowedFields = ['email', 'username', 'is_premium'];

            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    values.push(updates[field]);
                }
            });

            if (fields.length === 0) return this.getUserById(id);

            values.push(id);

            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            const stmt = this.db.prepare(query);
            stmt.run(...values);

            console.log(`✓ User updated: ${id}`);
            return this.getUserById(id);

        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Delete user
     */
    deleteUser(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes > 0) {
                console.log(`✓ User deleted: ${id}`);
                return true;
            }
            return false;

        } catch (error) {
            console.error('Error deleting user:', error);
            return false;
        }
    }

    /**
     * Get user statistics
     */
    getUserStats() {
        try {
            const stats = this.db.prepare(`
                SELECT
                    COUNT(*) as totalUsers,
                    SUM(CASE WHEN is_premium = 1 THEN 1 ELSE 0 END) as premiumUsers,
                    SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as newToday,
                    SUM(CASE WHEN date(last_login) = date('now') THEN 1 ELSE 0 END) as activeToday
                FROM users
            `).get();

            return stats;

        } catch (error) {
            console.error('Error getting user stats:', error);
            return { totalUsers: 0, premiumUsers: 0, newToday: 0, activeToday: 0 };
        }
    }

    // ==================== NOTIFICATIONS ====================

    /**
     * Create notification
     */
    createNotification(notifData) {
        try {
            const notification = {
                id: uuidv4(),
                title: notifData.title,
                message: notifData.message,
                type: notifData.type || 'system',
                icon: notifData.icon || null,
                action_url: notifData.action_url || null,
                is_global: notifData.is_global || 0,
                user_id: notifData.user_id || null,
                is_read: 0,
                created_at: new Date().toISOString()
            };

            const stmt = this.db.prepare(`
                INSERT INTO notifications (
                    id, title, message, type, icon, action_url, is_global, user_id, is_read, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                notification.id, notification.title, notification.message, notification.type,
                notification.icon, notification.action_url, notification.is_global, notification.user_id,
                notification.is_read, notification.created_at
            );

            console.log(`✓ Notification created: ${notification.title}`);
            return notification;

        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Get notifications
     */
    getNotifications(filters = {}) {
        try {
            let query = 'SELECT * FROM notifications WHERE 1=1';
            const params = [];

            if (filters.user_id) {
                query += ' AND (user_id = ? OR is_global = 1)';
                params.push(filters.user_id);
            } else if (filters.is_global !== undefined) {
                query += ' AND is_global = ?';
                params.push(filters.is_global);
            }

            if (filters.type) {
                query += ' AND type = ?';
                params.push(filters.type);
            }

            query += ' ORDER BY created_at DESC';

            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            const stmt = this.db.prepare(query);
            return stmt.all(...params);

        } catch (error) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    /**
     * Delete notification
     */
    deleteNotification(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?');
            const result = stmt.run(id);

            if (result.changes > 0) {
                console.log(`✓ Notification deleted: ${id}`);
                return true;
            }
            return false;

        } catch (error) {
            console.error('Error deleting notification:', error);
            return false;
        }
    }

    // ==================== STATISTICS ====================

    /**
     * Get content statistics
     */
    getContentStats() {
        try {
            const courses = this.db.prepare('SELECT COUNT(*) as count FROM courses').get();
            const users = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
            const notifications = this.db.prepare('SELECT COUNT(*) as count FROM notifications').get();

            return {
                totalCourses: courses.count,
                totalUsers: users.count,
                totalNotifications: notifications.count
            };

        } catch (error) {
            console.error('Error getting content stats:', error);
            return { totalCourses: 0, totalUsers: 0, totalNotifications: 0 };
        }
    }

    // ==================== CATEGORIES ====================

    /**
     * Create a new category
     */
    createCategory(categoryData) {
        const category = {
            id: uuidv4(),
            name: categoryData.name,
            description: categoryData.description || null,
            color: categoryData.color || '#FFD60A',
            icon: categoryData.icon || '📚',
            order_index: categoryData.order_index || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const stmt = this.db.prepare(`
            INSERT INTO categories (id, name, description, color, icon, order_index, created_at, updated_at)
            VALUES (@id, @name, @description, @color, @icon, @order_index, @created_at, @updated_at)
        `);

        stmt.run(category);
        return category;
    }

    /**
     * Get all categories
     */
    getCategories(options = {}) {
        let query = 'SELECT * FROM categories WHERE 1=1';
        const params = {};

        query += ' ORDER BY order_index ASC, name ASC';

        if (options.limit) {
            query += ' LIMIT @limit';
            params.limit = options.limit;
        }

        const stmt = this.db.prepare(query);
        return stmt.all(params);
    }

    /**
     * Get category by ID
     */
    getCategoryById(id) {
        const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
        return stmt.get(id);
    }

    /**
     * Get category by name
     */
    getCategoryByName(name) {
        const stmt = this.db.prepare('SELECT * FROM categories WHERE name = ?');
        return stmt.get(name);
    }

    /**
     * Update category
     */
    updateCategory(id, updates) {
        const allowedFields = ['name', 'description', 'color', 'icon', 'order_index'];
        const updateFields = [];
        const params = { id };

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = @${key}`);
                params[key] = value;
            }
        }

        if (updateFields.length === 0) {
            return this.getCategoryById(id);
        }

        updateFields.push('updated_at = @updated_at');
        params.updated_at = new Date().toISOString();

        const query = `UPDATE categories SET ${updateFields.join(', ')} WHERE id = @id`;
        const stmt = this.db.prepare(query);
        stmt.run(params);

        return this.getCategoryById(id);
    }

    /**
     * Delete category
     */
    deleteCategory(id) {
        const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Get category statistics
     */
    getCategoryStats() {
        const stmt = this.db.prepare(`
            SELECT
                c.id,
                c.name,
                c.color,
                c.icon,
                COUNT(co.id) as course_count
            FROM categories c
            LEFT JOIN courses co ON co.category = c.name
            GROUP BY c.id
            ORDER BY c.order_index ASC
        `);
        return stmt.all();
    }

    /**
     * Close database connection
     */
    close() {
        try {
            this.db.close();
            console.log('✓ Content database connection closed');
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

// Create singleton instance
const contentManager = new ContentManager();

// Graceful shutdown
process.on('SIGINT', () => {
    contentManager.close();
});

process.on('SIGTERM', () => {
    contentManager.close();
});

module.exports = contentManager;
