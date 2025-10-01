/**
 * Utility Functions Module
 * Common utilities for UI interactions, toasts, modals, and helpers
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    try {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.flp-toast');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'flp-toast fixed top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-elevated z-50 max-w-sm';

        // Set color based on type
        const colors = {
            success: 'bg-success text-bg',
            error: 'bg-danger text-white',
            warning: 'bg-warning text-bg',
            info: 'bg-bg-elevated text-label-primary border border-separator'
        };

        toast.className += ' ' + (colors[type] || colors.info);

        // Set message (use textContent to prevent XSS)
        const messageText = document.createElement('span');
        messageText.textContent = message;
        messageText.className = 'font-sf-ui text-sm font-medium';
        toast.appendChild(messageText);

        // Add to document
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translate(-50%, 0)';
        }, 10);

        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, -20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);

    } catch (error) {
        console.error('Toast error:', error);
    }
}

/**
 * Create and show modal
 * @param {Object} options - Modal configuration
 * @param {string} options.title - Modal title
 * @param {string} options.content - Modal content (text only for security)
 * @param {Array} options.buttons - Array of button objects {text, onClick, className}
 * @returns {HTMLElement} Modal element
 */
function createModal({ title, content, buttons = [] }) {
    try {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4';
        overlay.id = 'flp-modal-overlay';

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'bg-bg-elevated rounded-xl p-6 w-full max-w-sm shadow-elevated border border-separator/20';

        // Add title
        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'text-label-primary text-base font-semibold mb-4 text-center';
            titleEl.textContent = title;
            modal.appendChild(titleEl);
        }

        // Add content
        if (content) {
            const contentEl = document.createElement('div');
            contentEl.className = 'text-label-secondary text-sm mb-6 text-center';
            contentEl.textContent = content;
            modal.appendChild(contentEl);
        }

        // Add buttons
        if (buttons.length > 0) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'space-y-3';

            buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = button.className || 'w-full bg-fill-secondary text-label-primary font-sf-ui font-semibold py-3.5 px-4 rounded-lg hover:bg-fill-primary transition-all duration-200 active:scale-[0.98]';
                btn.textContent = button.text;
                btn.addEventListener('click', () => {
                    if (button.onClick) {
                        button.onClick();
                    }
                    closeModal();
                });
                buttonContainer.appendChild(btn);
            });

            modal.appendChild(buttonContainer);
        }

        // Add close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Animate in
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        return overlay;

    } catch (error) {
        console.error('Modal error:', error);
        return null;
    }
}

/**
 * Close active modal
 */
function closeModal() {
    try {
        const overlay = document.getElementById('flp-modal-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    } catch (error) {
        console.error('Close modal error:', error);
    }
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    } catch (error) {
        return `$${amount.toFixed(2)}`;
    }
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
function formatDate(date, options = {}) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
    } catch (error) {
        console.error('Date format error:', error);
        return 'Invalid date';
    }
}

/**
 * Get relative time string (e.g., "5 minutes ago")
 * @param {Date|string} date - Date to calculate from
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffMs = now - dateObj;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' });
        }
    } catch (error) {
        console.error('Relative time error:', error);
        return 'Unknown';
    }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            textArea.remove();
            return successful;
        }
    } catch (error) {
        console.error('Copy to clipboard error:', error);
        return false;
    }
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeUrl(url) {
    try {
        const urlObj = new URL(url);
        // Only allow http and https protocols
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return null;
        }
        return urlObj.href;
    } catch (error) {
        return null;
    }
}

/**
 * Loading state manager
 */
const LoadingManager = {
    show: function(message = 'Loading...') {
        const existing = document.getElementById('flp-loading');
        if (existing) return;

        const loading = document.createElement('div');
        loading.id = 'flp-loading';
        loading.className = 'fixed inset-0 bg-bg flex flex-col items-center justify-center z-50';

        const spinner = document.createElement('div');
        spinner.className = 'animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4';

        const text = document.createElement('div');
        text.className = 'text-label-secondary text-sm';
        text.textContent = message;

        loading.appendChild(spinner);
        loading.appendChild(text);
        document.body.appendChild(loading);
    },

    hide: function() {
        const loading = document.getElementById('flp-loading');
        if (loading) {
            loading.remove();
        }
    }
};

// Export functions for use in modules and HTML
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.createModal = createModal;
    window.closeModal = closeModal;
    window.formatCurrency = formatCurrency;
    window.formatDate = formatDate;
    window.getRelativeTime = getRelativeTime;
    window.debounce = debounce;
    window.throttle = throttle;
    window.copyToClipboard = copyToClipboard;
    window.sanitizeUrl = sanitizeUrl;
    window.LoadingManager = LoadingManager;
}

export {
    showToast,
    createModal,
    closeModal,
    formatCurrency,
    formatDate,
    getRelativeTime,
    debounce,
    throttle,
    copyToClipboard,
    sanitizeUrl,
    LoadingManager
};
