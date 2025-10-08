/**
 * Settings Manager - Frontend
 * Handles all user settings with backend persistence
 */

class SettingsManager {
    constructor() {
        this.API_BASE = '/api/settings';
        this.userId = this.getUserId();
        this.currentUser = null;
        this.settings = null;
    }

    getUserId() {
        const userData = localStorage.getItem('flp_user');
        if (userData) {
            const user = JSON.parse(userData);
            return user.id || user.email || `user_${user.name}`;
        }
        let anonId = localStorage.getItem('flp_anon_id');
        if (!anonId) {
            anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('flp_anon_id', anonId);
        }
        return anonId;
    }

    async apiRequest(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `User ${this.userId}`,
            ...options.headers
        };
        const response = await fetch(`${this.API_BASE}${endpoint}`, { ...options, headers });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }
        return response.json();
    }

    async loadSettings() {
        try {
            const result = await this.apiRequest('');
            this.settings = result.settings;

            // Update profile display
            this.updateProfileDisplay();

            // Set all toggles based on backend data
            this.applySettingsToUI();

            return this.settings;
        } catch (error) {
            console.error('Load settings error:', error);
            // Fallback to local storage
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        const userData = localStorage.getItem('flp_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        } else {
            this.currentUser = {
                id: this.userId,
                username: 'Anonymous User',
                email: 'Not logged in'
            };
        }
        this.updateProfileDisplay();
    }

    updateProfileDisplay() {
        const profile = this.settings?.profile || this.currentUser || {};

        // Update avatar
        const initials = profile.username
            ? profile.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : '?';
        document.getElementById('profileAvatar').innerHTML = `
            <span class="text-xs font-semibold text-primary">${initials}</span>
        `;

        // Update name and email
        document.getElementById('profileName').textContent = profile.username || 'No name';
        document.getElementById('profileEmail').textContent = profile.email || 'No email';
    }

    applySettingsToUI() {
        if (!this.settings) return;

        // Notification toggles
        this.setToggle('toggle-signals', this.settings.notifications.signals);
        this.setToggle('toggle-price-alerts', this.settings.notifications.priceAlerts);
        this.setToggle('toggle-new-courses', this.settings.notifications.newCourses);
        this.setToggle('toggle-marketing', this.settings.notifications.marketing);

        // Privacy settings
        this.setToggle('toggle-biometric', this.settings.privacy.biometricLogin);
        this.setToggle('toggle-analytics', this.settings.privacy.analyticsEnabled);
    }

    setToggle(id, checked) {
        const toggle = document.getElementById(id);
        if (toggle) {
            toggle.checked = checked;
        }
    }

    async updateProfile(username, email) {
        try {
            const result = await this.apiRequest('/profile', {
                method: 'PUT',
                body: JSON.stringify({ username, email })
            });

            // Update local copy
            this.settings.profile = result.profile;
            this.currentUser = { ...this.currentUser, username, email };

            // Also update localStorage
            localStorage.setItem('flp_user', JSON.stringify(this.currentUser));

            return result;
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    async updateNotifications(preferences) {
        try {
            const result = await this.apiRequest('/notifications', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });

            // Update local copy
            if (this.settings) {
                Object.assign(this.settings.notifications, preferences);
            }

            return result;
        } catch (error) {
            console.error('Update notifications error:', error);
            throw error;
        }
    }

    async updateAppSettings(settings) {
        try {
            const result = await this.apiRequest('/app', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });

            // Update local copy
            if (this.settings) {
                Object.assign(this.settings.app, settings);
            }

            return result;
        } catch (error) {
            console.error('Update app settings error:', error);
            throw error;
        }
    }

    async updatePrivacySettings(settings) {
        try {
            const result = await this.apiRequest('/privacy', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });

            // Update local copy
            if (this.settings) {
                Object.assign(this.settings.privacy, settings);
            }

            return result;
        } catch (error) {
            console.error('Update privacy settings error:', error);
            throw error;
        }
    }

    async resetAllSettings() {
        try {
            const result = await this.apiRequest('/reset', { method: 'POST' });

            // Update local copy
            this.settings.notifications = result.settings.notifications;
            this.settings.app = result.settings.app;
            this.settings.privacy = result.settings.privacy;

            // Reapply to UI
            this.applySettingsToUI();

            return result;
        } catch (error) {
            console.error('Reset settings error:', error);
            throw error;
        }
    }

    async exportData() {
        try {
            const result = await this.apiRequest('/export');

            // Download as JSON
            const dataStr = JSON.stringify(result.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `flp-data-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            return result;
        } catch (error) {
            console.error('Export data error:', error);
            throw error;
        }
    }

    async clearCache() {
        try {
            const result = await this.apiRequest('/cache/clear', { method: 'POST' });

            // Also clear localStorage cache items
            const keysToKeep = ['flp_user', 'flp_anon_id'];
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });

            return result;
        } catch (error) {
            console.error('Clear cache error:', error);
            throw error;
        }
    }

    async deleteAccount() {
        try {
            const result = await this.apiRequest('', { method: 'DELETE' });

            // Clear all localStorage
            localStorage.clear();

            return result;
        } catch (error) {
            console.error('Delete account error:', error);
            throw error;
        }
    }
}

// Create global instance
const settingsManager = new SettingsManager();

// Initialize when page loads
window.addEventListener('DOMContentLoaded', async () => {
    await settingsManager.loadSettings();
    setupEventListeners();
});

function setupEventListeners() {
    // Notification toggles
    document.getElementById('toggle-signals')?.addEventListener('change', (e) => {
        settingsManager.updateNotifications({ signals: e.target.checked });
    });

    document.getElementById('toggle-price-alerts')?.addEventListener('change', (e) => {
        settingsManager.updateNotifications({ priceAlerts: e.target.checked });
    });

    document.getElementById('toggle-new-courses')?.addEventListener('change', (e) => {
        settingsManager.updateNotifications({ newCourses: e.target.checked });
    });

    document.getElementById('toggle-marketing')?.addEventListener('change', (e) => {
        settingsManager.updateNotifications({ marketing: e.target.checked });
    });

    // Privacy settings
    document.getElementById('toggle-biometric')?.addEventListener('change', (e) => {
        settingsManager.updatePrivacySettings({ biometricLogin: e.target.checked });
    });

    document.getElementById('toggle-analytics')?.addEventListener('change', (e) => {
        settingsManager.updatePrivacySettings({ analyticsEnabled: e.target.checked });
    });

    // Buttons
    document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
        if (confirm('Clear all cached data? This will remove downloaded content.')) {
            try {
                await settingsManager.clearCache();
                showMessage('Cache cleared successfully', 'success');
            } catch (error) {
                showMessage('Failed to clear cache', 'error');
            }
        }
    });
}

// Profile edit functions
function toggleEditMode() {
    const isEditMode = document.getElementById('profileEditForm').classList.toggle('hidden');

    if (!isEditMode) {
        // Populate form
        const profile = settingsManager.settings?.profile || settingsManager.currentUser || {};
        document.getElementById('editUsername').value = profile.username || '';
        document.getElementById('editEmail').value = profile.email || '';
    }
}

async function saveProfile() {
    const username = document.getElementById('editUsername').value.trim();
    const email = document.getElementById('editEmail').value.trim();

    if (!username || !email) {
        alert('Please fill in all fields');
        return;
    }

    try {
        await settingsManager.updateProfile(username, email);
        settingsManager.updateProfileDisplay();
        toggleEditMode();
        showMessage('Profile updated successfully!', 'success');
    } catch (error) {
        showMessage('Failed to update profile', 'error');
    }
}

async function deleteAccount() {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
            await settingsManager.deleteAccount();
            window.location.href = 'index.html';
        } catch (error) {
            showMessage('Failed to delete account', 'error');
        }
    }
}

function showMessage(message, type) {
    const bgColor = type === 'success' ? 'bg-success' : 'bg-danger';
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-4 py-2 rounded-lg text-xs font-medium z-50 shadow-elevated`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
