/**
 * Shared Admin Layout with Left Sidebar
 * Consistent navigation across all admin pages
 */

class AdminLayout {
    constructor(currentPage) {
        this.currentPage = currentPage;
        this.init();
    }

    init() {
        this.renderSidebar();
        this.renderTopbar();
        this.setupEventListeners();
        this.loadAdminInfo();
    }

    renderSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'adminSidebar';
        sidebar.className = 'fixed top-0 left-0 h-screen w-64 bg-bg-elevated border-r border-separator/30 flex flex-col z-50';

        sidebar.innerHTML = `
            <!-- Logo -->
            <div class="p-6 border-b border-separator/30">
                <div class="text-primary text-2xl font-bold mb-1">FLP Admin</div>
                <div class="text-label-tertiary text-xs">Management Console</div>
            </div>

            <!-- Navigation -->
            <nav class="flex-1 p-4 overflow-y-auto">
                <div class="space-y-1">
                    ${this.createNavItem('dashboard', 'Dashboard', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('signals', 'Signals', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('content', 'Content', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('posts', 'Community Posts', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('users', 'Users', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('categories', 'Categories', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"></path>
                            <path d="M6 6h.008v.008H6V6z"></path>
                        </svg>
                    `)}

                    ${this.createNavItem('settings', 'Settings', `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    `)}
                </div>
            </nav>

            <!-- User Info & Logout -->
            <div class="p-4 border-t border-separator/30">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span class="text-primary font-bold text-sm" id="adminInitial">A</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="text-white text-sm font-medium truncate" id="sidebarUsername">Admin</div>
                        <div class="text-label-tertiary text-xs truncate" id="sidebarRole">Super Admin</div>
                    </div>
                </div>
                <button id="sidebarLogout" class="w-full px-4 py-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors text-sm font-medium flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                    Logout
                </button>
            </div>
        `;

        document.body.insertBefore(sidebar, document.body.firstChild);
    }

    createNavItem(page, label, icon) {
        const isActive = this.currentPage === page;
        const activeClasses = isActive
            ? 'bg-primary/10 text-primary border-primary'
            : 'text-label-secondary hover:bg-bg-secondary hover:text-white border-transparent';

        const href = page === 'dashboard' ? '/admin.html' : `/admin-${page}.html`;

        return `
            <a href="${href}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all border-l-2 ${activeClasses}">
                ${icon}
                <span class="font-medium">${label}</span>
            </a>
        `;
    }

    renderTopbar() {
        const topbar = document.createElement('header');
        topbar.id = 'adminTopbar';
        topbar.className = 'fixed top-0 left-64 right-0 h-16 bg-bg-elevated/80 backdrop-blur-xl border-b border-separator/30 flex items-center justify-between px-6 z-40';

        topbar.innerHTML = `
            <div>
                <h1 class="text-xl font-bold text-white" id="pageTitle">Dashboard</h1>
                <p class="text-xs text-label-tertiary" id="pageSubtitle">Welcome back</p>
            </div>

            <div class="flex items-center gap-4">
                <!-- Quick Actions -->
                <button onclick="window.location.reload()" class="p-2 hover:bg-bg-secondary rounded-lg transition-colors" title="Refresh">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-5 h-5 text-label-secondary">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                </button>

                <!-- Mobile Menu Toggle -->
                <button id="mobileMenuToggle" class="lg:hidden p-2 hover:bg-bg-secondary rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-6 h-6 text-label-secondary">
                        <path d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        `;

        const existingTopbar = document.getElementById('adminTopbar');
        if (existingTopbar) {
            existingTopbar.replaceWith(topbar);
        } else {
            document.body.insertBefore(topbar, document.body.children[1]);
        }
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('sidebarLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', this.toggleMobileSidebar.bind(this));
        }

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('adminSidebar');
            const toggle = document.getElementById('mobileMenuToggle');

            if (window.innerWidth < 1024 &&
                !sidebar.contains(e.target) &&
                !toggle.contains(e.target) &&
                !sidebar.classList.contains('-translate-x-full')) {
                this.toggleMobileSidebar();
            }
        });
    }

    loadAdminInfo() {
        const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        if (adminUser.username) {
            const usernameEl = document.getElementById('sidebarUsername');
            const roleEl = document.getElementById('sidebarRole');
            const initialEl = document.getElementById('adminInitial');

            if (usernameEl) usernameEl.textContent = adminUser.username;
            if (roleEl) roleEl.textContent = this.formatRole(adminUser.role);
            if (initialEl) initialEl.textContent = adminUser.username.charAt(0).toUpperCase();
        }
    }

    formatRole(role) {
        return role.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    async handleLogout() {
        const token = localStorage.getItem('admin_token');

        if (token) {
            try {
                await fetch('/api/admin/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        localStorage.clear();
        window.location.href = '/admin-login.html';
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        sidebar.classList.toggle('-translate-x-full');
    }

    setPageTitle(title, subtitle) {
        const titleEl = document.getElementById('pageTitle');
        const subtitleEl = document.getElementById('pageSubtitle');

        if (titleEl) titleEl.textContent = title;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    }
}

// Auto-initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Ensure main content has proper margin
    const main = document.querySelector('main');
    if (main && !main.classList.contains('ml-64')) {
        main.classList.add('ml-64', 'pt-16');
    }
});
