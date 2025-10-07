/**
 * Course Storage Manager - Hybrid Local & Backend Storage
 * Handles watch later, bookmarks, and progress tracking
 * Syncs with backend API for persistence across devices
 */

class CourseStorage {
    constructor() {
        this.WATCH_LATER_KEY = 'flp_watch_later';
        this.PROGRESS_KEY = 'flp_course_progress';
        this.BOOKMARKS_KEY = 'flp_bookmarks';
        this.API_BASE = '/api/content/user';
        this.userId = this.getUserId();
    }

    /**
     * Get or generate user ID
     */
    getUserId() {
        // Try to get from logged-in user
        const userData = localStorage.getItem('flp_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.id || user.email || `user_${user.name}`;
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        // Use or generate anonymous ID
        let anonId = localStorage.getItem('flp_anon_id');
        if (!anonId) {
            anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('flp_anon_id', anonId);
        }
        return anonId;
    }

    /**
     * Make API request with user ID header
     */
    async apiRequest(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `User ${this.userId}`,
            ...options.headers
        };

        const response = await fetch(`${this.API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    // ==================== WATCH LATER (SAVED CONTENT) ====================

    /**
     * Add course to watch later - Syncs with backend
     */
    async addToWatchLater(course) {
        try {
            // Add to backend
            const result = await this.apiRequest(`/saved/${course.id}`, {
                method: 'POST'
            });

            // Also store locally for offline access
            const watchLater = this.getWatchLaterLocal();
            const exists = watchLater.find(c => c.id === course.id);

            if (!exists) {
                const courseData = {
                    ...course,
                    addedAt: new Date().toISOString()
                };
                watchLater.unshift(courseData);
                localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));
            }

            return { success: true, message: 'Added to watch later', saved: true };
        } catch (error) {
            console.error('Add to watch later error:', error);
            // Fallback to local storage only
            return this.addToWatchLaterLocal(course);
        }
    }

    /**
     * Remove course from watch later - Syncs with backend
     */
    async removeFromWatchLater(courseId) {
        try {
            // Remove from backend
            await this.apiRequest(`/saved/${courseId}`, {
                method: 'DELETE'
            });

            // Also remove locally
            let watchLater = this.getWatchLaterLocal();
            watchLater = watchLater.filter(c => c.id !== courseId);
            localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));

            return { success: true, message: 'Removed from watch later', saved: false };
        } catch (error) {
            console.error('Remove from watch later error:', error);
            // Fallback to local storage only
            return this.removeFromWatchLaterLocal(courseId);
        }
    }

    /**
     * Get all watch later courses - Fetches from backend
     */
    async getWatchLater() {
        try {
            const result = await this.apiRequest('/saved');
            // Update local storage
            if (result.success && result.courses) {
                localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(result.courses));
                return result.courses;
            }
        } catch (error) {
            console.error('Get watch later error:', error);
        }
        // Fallback to local storage
        return this.getWatchLaterLocal();
    }

    /**
     * Check if course is in watch later - Checks backend
     */
    async isInWatchLater(courseId) {
        try {
            const result = await this.apiRequest(`/saved/${courseId}/check`);
            return result.saved || false;
        } catch (error) {
            console.error('Check watch later error:', error);
            // Fallback to local check
            const watchLater = this.getWatchLaterLocal();
            return watchLater.some(c => c.id === courseId);
        }
    }

    /**
     * Clear all watch later
     */
    async clearWatchLater() {
        // Note: Backend doesn't have bulk delete yet, so we delete locally
        localStorage.removeItem(this.WATCH_LATER_KEY);
        return { success: true, message: 'Watch later cleared' };
    }

    // ==================== LOCAL STORAGE FALLBACKS ====================

    addToWatchLaterLocal(course) {
        const watchLater = this.getWatchLaterLocal();
        const exists = watchLater.find(c => c.id === course.id);

        if (exists) {
            return { success: false, message: 'Already in watch later' };
        }

        const courseData = {
            ...course,
            addedAt: new Date().toISOString()
        };

        watchLater.unshift(courseData);
        localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));

        return { success: true, message: 'Added to watch later (offline)' };
    }

    removeFromWatchLaterLocal(courseId) {
        let watchLater = this.getWatchLaterLocal();
        watchLater = watchLater.filter(c => c.id !== courseId);
        localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));

        return { success: true, message: 'Removed from watch later (offline)' };
    }

    getWatchLaterLocal() {
        const data = localStorage.getItem(this.WATCH_LATER_KEY);
        return data ? JSON.parse(data) : [];
    }

    // ==================== PROGRESS TRACKING ====================

    /**
     * Mark course as completed - Syncs with backend
     */
    async markAsCompleted(courseId, courseTitle) {
        try {
            await this.apiRequest(`/progress/${courseId}`, {
                method: 'POST',
                body: JSON.stringify({
                    progress_percent: 100,
                    completed: true
                })
            });

            // Also update locally
            const progress = this.getProgressLocal();
            progress[courseId] = {
                completed: true,
                completedAt: new Date().toISOString(),
                title: courseTitle,
                progress: 100
            };
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));

            return { success: true, message: 'Course marked as completed' };
        } catch (error) {
            console.error('Mark as completed error:', error);
            return this.markAsCompletedLocal(courseId, courseTitle);
        }
    }

    /**
     * Update course progress percentage - Syncs with backend
     */
    async updateProgress(courseId, courseTitle, percentage) {
        try {
            await this.apiRequest(`/progress/${courseId}`, {
                method: 'POST',
                body: JSON.stringify({
                    progress_percent: percentage,
                    completed: percentage >= 100
                })
            });

            // Also update locally
            const progress = this.getProgressLocal();
            progress[courseId] = {
                completed: percentage >= 100,
                completedAt: percentage >= 100 ? new Date().toISOString() : null,
                title: courseTitle,
                progress: percentage,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));

            return { success: true, message: 'Progress updated' };
        } catch (error) {
            console.error('Update progress error:', error);
            return this.updateProgressLocal(courseId, courseTitle, percentage);
        }
    }

    /**
     * Get course progress - Fetches from backend
     */
    async getCourseProgress(courseId) {
        try {
            const result = await this.apiRequest(`/progress/${courseId}`);
            if (result.success && result.progress) {
                return {
                    completed: result.progress.completed || false,
                    progress: result.progress.progress_percent || 0
                };
            }
        } catch (error) {
            console.error('Get course progress error:', error);
        }
        // Fallback to local
        return this.getCourseProgressLocal(courseId);
    }

    /**
     * Get all progress data - Fetches from backend
     */
    async getProgress() {
        try {
            const result = await this.apiRequest('/progress');
            if (result.success && result.history) {
                // Convert to local format
                const progress = {};
                result.history.forEach(item => {
                    progress[item.course_id] = {
                        completed: item.completed,
                        progress: item.progress_percent,
                        title: item.title,
                        lastUpdated: item.last_watched
                    };
                });
                localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
                return progress;
            }
        } catch (error) {
            console.error('Get progress error:', error);
        }
        return this.getProgressLocal();
    }

    /**
     * Get completed courses
     */
    async getCompletedCourses() {
        const progress = await this.getProgress();
        return Object.entries(progress)
            .filter(([_, data]) => data.completed)
            .map(([id, data]) => ({ id, ...data }));
    }

    /**
     * Get in-progress courses
     */
    async getInProgressCourses() {
        const progress = await this.getProgress();
        return Object.entries(progress)
            .filter(([_, data]) => !data.completed && data.progress > 0)
            .map(([id, data]) => ({ id, ...data }));
    }

    /**
     * Get statistics - Fetches from backend
     */
    async getStats() {
        try {
            const result = await this.apiRequest('/stats');
            if (result.success && result.stats) {
                return {
                    total: result.stats.inProgress + result.stats.completed,
                    completed: result.stats.completed,
                    inProgress: result.stats.inProgress,
                    saved: result.stats.saved,
                    averageProgress: result.stats.averageProgress || 0
                };
            }
        } catch (error) {
            console.error('Get stats error:', error);
        }
        // Fallback to local stats
        return this.getStatsLocal();
    }

    // ==================== LOCAL PROGRESS FALLBACKS ====================

    markAsCompletedLocal(courseId, courseTitle) {
        const progress = this.getProgressLocal();
        progress[courseId] = {
            completed: true,
            completedAt: new Date().toISOString(),
            title: courseTitle,
            progress: 100
        };
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
        return { success: true, message: 'Course marked as completed (offline)' };
    }

    updateProgressLocal(courseId, courseTitle, percentage) {
        const progress = this.getProgressLocal();
        progress[courseId] = {
            completed: percentage >= 100,
            completedAt: percentage >= 100 ? new Date().toISOString() : null,
            title: courseTitle,
            progress: percentage,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));
        return { success: true, message: 'Progress updated (offline)' };
    }

    getCourseProgressLocal(courseId) {
        const progress = this.getProgressLocal();
        return progress[courseId] || { completed: false, progress: 0 };
    }

    getProgressLocal() {
        const data = localStorage.getItem(this.PROGRESS_KEY);
        return data ? JSON.parse(data) : {};
    }

    getStatsLocal() {
        const progress = this.getProgressLocal();
        const entries = Object.values(progress);

        return {
            total: entries.length,
            completed: entries.filter(p => p.completed).length,
            inProgress: entries.filter(p => !p.completed && p.progress > 0).length,
            saved: this.getWatchLaterLocal().length,
            averageProgress: entries.length > 0
                ? entries.reduce((sum, p) => sum + p.progress, 0) / entries.length
                : 0
        };
    }

    // ==================== BOOKMARKS ====================

    /**
     * Toggle bookmark (local only for now)
     */
    toggleBookmark(courseId, courseData = null) {
        const bookmarks = this.getBookmarks();
        const index = bookmarks.findIndex(b => b.id === courseId);

        if (index !== -1) {
            bookmarks.splice(index, 1);
            localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
            return { success: true, bookmarked: false, message: 'Bookmark removed' };
        } else {
            if (courseData) {
                bookmarks.unshift({
                    ...courseData,
                    bookmarkedAt: new Date().toISOString()
                });
                localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
            }
            return { success: true, bookmarked: true, message: 'Bookmark added' };
        }
    }

    isBookmarked(courseId) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.id === courseId);
    }

    getBookmarks() {
        const data = localStorage.getItem(this.BOOKMARKS_KEY);
        return data ? JSON.parse(data) : [];
    }

    // ==================== UTILITY ====================

    async exportData() {
        return {
            watchLater: await this.getWatchLater(),
            progress: await this.getProgress(),
            bookmarks: this.getBookmarks(),
            exportedAt: new Date().toISOString()
        };
    }

    importData(data) {
        if (data.watchLater) {
            localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(data.watchLater));
        }
        if (data.progress) {
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(data.progress));
        }
        if (data.bookmarks) {
            localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(data.bookmarks));
        }
        return { success: true, message: 'Data imported successfully' };
    }

    clearAll() {
        localStorage.removeItem(this.WATCH_LATER_KEY);
        localStorage.removeItem(this.PROGRESS_KEY);
        localStorage.removeItem(this.BOOKMARKS_KEY);
        return { success: true, message: 'All course data cleared' };
    }
}

// Create global instance
const courseStorage = new CourseStorage();

// Make available globally
window.courseStorage = courseStorage;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CourseStorage;
}
