/**
 * Course Storage Manager
 * Handles watch later, bookmarks, and progress tracking
 */

class CourseStorage {
    constructor() {
        this.WATCH_LATER_KEY = 'flp_watch_later';
        this.PROGRESS_KEY = 'flp_course_progress';
        this.BOOKMARKS_KEY = 'flp_bookmarks';
    }

    // ==================== WATCH LATER ====================

    /**
     * Add course to watch later
     */
    addToWatchLater(course) {
        const watchLater = this.getWatchLater();

        // Check if already exists
        const exists = watchLater.find(c => c.id === course.id);
        if (exists) {
            return { success: false, message: 'Already in watch later' };
        }

        // Add course with timestamp
        const courseData = {
            ...course,
            addedAt: new Date().toISOString()
        };

        watchLater.unshift(courseData);
        localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));

        return { success: true, message: 'Added to watch later' };
    }

    /**
     * Remove course from watch later
     */
    removeFromWatchLater(courseId) {
        let watchLater = this.getWatchLater();
        watchLater = watchLater.filter(c => c.id !== courseId);
        localStorage.setItem(this.WATCH_LATER_KEY, JSON.stringify(watchLater));

        return { success: true, message: 'Removed from watch later' };
    }

    /**
     * Get all watch later courses
     */
    getWatchLater() {
        const data = localStorage.getItem(this.WATCH_LATER_KEY);
        return data ? JSON.parse(data) : [];
    }

    /**
     * Check if course is in watch later
     */
    isInWatchLater(courseId) {
        const watchLater = this.getWatchLater();
        return watchLater.some(c => c.id === courseId);
    }

    /**
     * Clear all watch later
     */
    clearWatchLater() {
        localStorage.removeItem(this.WATCH_LATER_KEY);
        return { success: true, message: 'Watch later cleared' };
    }

    // ==================== PROGRESS TRACKING ====================

    /**
     * Mark course as completed
     */
    markAsCompleted(courseId, courseTitle) {
        const progress = this.getProgress();

        progress[courseId] = {
            completed: true,
            completedAt: new Date().toISOString(),
            title: courseTitle,
            progress: 100
        };

        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));

        return { success: true, message: 'Course marked as completed' };
    }

    /**
     * Update course progress percentage
     */
    updateProgress(courseId, courseTitle, percentage) {
        const progress = this.getProgress();

        progress[courseId] = {
            completed: percentage >= 100,
            completedAt: percentage >= 100 ? new Date().toISOString() : null,
            title: courseTitle,
            progress: percentage,
            lastUpdated: new Date().toISOString()
        };

        localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progress));

        return { success: true, message: 'Progress updated' };
    }

    /**
     * Get course progress
     */
    getCourseProgress(courseId) {
        const progress = this.getProgress();
        return progress[courseId] || { completed: false, progress: 0 };
    }

    /**
     * Get all progress data
     */
    getProgress() {
        const data = localStorage.getItem(this.PROGRESS_KEY);
        return data ? JSON.parse(data) : {};
    }

    /**
     * Get completed courses
     */
    getCompletedCourses() {
        const progress = this.getProgress();
        return Object.entries(progress)
            .filter(([_, data]) => data.completed)
            .map(([id, data]) => ({ id, ...data }));
    }

    /**
     * Get in-progress courses
     */
    getInProgressCourses() {
        const progress = this.getProgress();
        return Object.entries(progress)
            .filter(([_, data]) => !data.completed && data.progress > 0)
            .map(([id, data]) => ({ id, ...data }));
    }

    /**
     * Get statistics
     */
    getStats() {
        const progress = this.getProgress();
        const entries = Object.values(progress);

        return {
            total: entries.length,
            completed: entries.filter(p => p.completed).length,
            inProgress: entries.filter(p => !p.completed && p.progress > 0).length,
            averageProgress: entries.length > 0
                ? entries.reduce((sum, p) => sum + p.progress, 0) / entries.length
                : 0
        };
    }

    // ==================== BOOKMARKS ====================

    /**
     * Toggle bookmark
     */
    toggleBookmark(courseId, courseData = null) {
        const bookmarks = this.getBookmarks();
        const index = bookmarks.findIndex(b => b.id === courseId);

        if (index !== -1) {
            // Remove bookmark
            bookmarks.splice(index, 1);
            localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
            return { success: true, bookmarked: false, message: 'Bookmark removed' };
        } else {
            // Add bookmark
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

    /**
     * Check if course is bookmarked
     */
    isBookmarked(courseId) {
        const bookmarks = this.getBookmarks();
        return bookmarks.some(b => b.id === courseId);
    }

    /**
     * Get all bookmarks
     */
    getBookmarks() {
        const data = localStorage.getItem(this.BOOKMARKS_KEY);
        return data ? JSON.parse(data) : [];
    }

    // ==================== UTILITY ====================

    /**
     * Export all data
     */
    exportData() {
        return {
            watchLater: this.getWatchLater(),
            progress: this.getProgress(),
            bookmarks: this.getBookmarks(),
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import data
     */
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

    /**
     * Clear all data
     */
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
