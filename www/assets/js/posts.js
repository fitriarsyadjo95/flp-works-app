/**
 * Community Posts Frontend Handler
 * Manages post feed, reactions, and real-time updates
 */

class PostsManager {
    constructor() {
        this.posts = [];
        this.currentOffset = 0;
        this.limit = 20;
        this.loading = false;
        this.hasMore = true;
        this.socket = null;
        this.userId = this.generateUserId();
        this.userReactions = {}; // Track user's reactions per post
    }

    /**
     * Generate or retrieve user ID
     */
    generateUserId() {
        let userId = localStorage.getItem('flp_posts_user_id');
        if (!userId) {
            const user = localStorage.getItem('flp_user');
            if (user) {
                const userData = JSON.parse(user);
                userId = `user_${userData.id || userData.name}`;
            } else {
                userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            localStorage.setItem('flp_posts_user_id', userId);
        }
        return userId;
    }

    /**
     * Initialize posts manager
     */
    async init() {
        console.log('Initializing Posts Manager...');
        this.setupWebSocket();
        await this.loadPosts();
        this.setupInfiniteScroll();
        this.setupPullToRefresh();
    }

    /**
     * Setup WebSocket for real-time updates
     */
    setupWebSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('✓ Connected to posts WebSocket');
        });

        this.socket.on('new-post', (post) => {
            console.log('New post received:', post);
            this.addNewPost(post);
            this.showNewPostIndicator();
        });

        this.socket.on('post-reaction', (data) => {
            console.log('Post reaction update:', data);
            this.updatePostReactions(data.postId, data.reactions);
        });

        this.socket.on('post-updated', (post) => {
            console.log('Post updated:', post);
            this.updatePost(post);
        });

        this.socket.on('post-deleted', (data) => {
            console.log('Post deleted:', data.postId);
            this.removePost(data.postId);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from posts WebSocket');
        });
    }

    /**
     * Load posts from API
     */
    async loadPosts(reset = false) {
        if (this.loading || (!this.hasMore && !reset)) return;

        this.loading = true;
        if (reset) {
            this.currentOffset = 0;
            this.posts = [];
        }

        try {
            const response = await fetch(
                `/api/posts/feed?limit=${this.limit}&offset=${this.currentOffset}`
            );
            const data = await response.json();

            if (data.success) {
                this.posts = reset ? data.posts : [...this.posts, ...data.posts];
                this.currentOffset += data.posts.length;
                this.hasMore = data.pagination.hasMore;

                // Load user reactions for each post
                await this.loadUserReactions();

                this.renderPosts();
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showError('Failed to load posts');
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }

    /**
     * Load user's reactions for all posts
     */
    async loadUserReactions() {
        for (const post of this.posts) {
            try {
                const response = await fetch(`/api/posts/${post.id}/my-reactions`, {
                    headers: {
                        'Authorization': `User ${this.userId}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    this.userReactions[post.id] = data.reactions;
                }
            } catch (error) {
                console.error(`Error loading reactions for post ${post.id}:`, error);
            }
        }
    }

    /**
     * Render posts to DOM
     */
    renderPosts() {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        if (this.posts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-label-tertiary text-sm mb-2">No posts yet</div>
                    <div class="text-label-quaternary text-xs">Check back later for updates</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.posts.map(post => this.renderPost(post)).join('');
        this.attachEventListeners();
    }

    /**
     * Render individual post
     */
    renderPost(post) {
        const userReactions = this.userReactions[post.id] || [];
        const relativeTime = this.getRelativeTime(post.created_at);
        const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);

        const reactionButtons = [
            { type: 'like', emoji: '👍', label: 'Like' },
            { type: 'heart', emoji: '❤️', label: 'Love' },
            { type: 'fire', emoji: '🔥', label: 'Fire' },
            { type: 'chart', emoji: '📈', label: 'Chart' }
        ];

        return `
            <div class="post-card bg-bg-elevated rounded-lg overflow-hidden shadow-soft border border-separator/20 mb-4" data-post-id="${post.id}">
                ${post.is_pinned ? `
                    <div class="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2">
                        <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z" />
                        </svg>
                        <span class="text-xs text-primary font-semibold">Pinned Post</span>
                    </div>
                ` : ''}

                <div class="p-4">
                    <!-- Admin Header -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <img src="assets/images/logo.png" alt="FLP Logo" class="w-10 h-10 rounded-full object-cover">
                            <div>
                                <div class="flex items-center gap-1.5">
                                    <span class="text-sm font-semibold text-label-primary">FLP AcademyWorks</span>
                                    <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                </div>
                                <div class="text-xs text-label-tertiary">${relativeTime}</div>
                            </div>
                        </div>
                        <div class="text-label-tertiary text-xs flex items-center gap-1">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"></path>
                                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            ${this.formatNumber(post.view_count)}
                        </div>
                    </div>

                    <!-- Post Content -->
                    <div class="mb-4">
                        <p class="text-label-primary text-sm leading-relaxed whitespace-pre-wrap">${this.escapeHtml(post.content)}</p>
                    </div>

                    ${post.media_url ? this.renderMedia(post.media_url, post.media_type) : ''}

                    <!-- Reaction Bar -->
                    <div class="border-t border-separator/20 pt-3">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-xs text-label-tertiary">
                                ${totalReactions > 0 ? `${this.formatNumber(totalReactions)} reaction${totalReactions > 1 ? 's' : ''}` : 'No reactions yet'}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${reactionButtons.map(btn => `
                                <button
                                    class="reaction-btn flex-1 py-2.5 px-3 rounded-lg transition-all ${userReactions.includes(btn.type) ? 'bg-primary/20 border border-primary/40' : 'bg-fill-tertiary hover:bg-fill-secondary'}"
                                    data-post-id="${post.id}"
                                    data-reaction="${btn.type}"
                                    title="${btn.label}"
                                >
                                    <div class="flex items-center justify-center gap-1.5">
                                        <span class="text-lg">${btn.emoji}</span>
                                        <span class="text-sm text-label-${userReactions.includes(btn.type) ? 'primary' : 'tertiary'} font-semibold">
                                            ${post.reactions[btn.type] || 0}
                                        </span>
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render media (image/video)
     */
    renderMedia(mediaUrl, mediaType) {
        if (mediaType === 'image') {
            return `
                <div class="mb-4 rounded-lg overflow-hidden">
                    <img src="${mediaUrl}" alt="Post media" class="w-full h-auto">
                </div>
            `;
        } else if (mediaType === 'video') {
            return `
                <div class="mb-4 rounded-lg overflow-hidden">
                    <video controls class="w-full h-auto">
                        <source src="${mediaUrl}" type="video/mp4">
                    </video>
                </div>
            `;
        }
        return '';
    }

    /**
     * Attach event listeners to reaction buttons
     */
    attachEventListeners() {
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = parseInt(btn.dataset.postId);
                const reactionType = btn.dataset.reaction;
                this.toggleReaction(postId, reactionType);
            });
        });

        // Record views for visible posts
        this.recordVisiblePostViews();
    }

    /**
     * Toggle reaction
     */
    async toggleReaction(postId, reactionType) {
        const userReactions = this.userReactions[postId] || [];
        const hasReacted = userReactions.includes(reactionType);

        try {
            const response = await fetch(`/api/posts/${postId}/react`, {
                method: hasReacted ? 'DELETE' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `User ${this.userId}`
                },
                body: JSON.stringify({ reactionType })
            });

            const data = await response.json();

            if (data.success) {
                // Update local state
                if (hasReacted) {
                    this.userReactions[postId] = userReactions.filter(r => r !== reactionType);
                } else {
                    this.userReactions[postId] = [...userReactions, reactionType];
                }

                // Update post reactions
                const post = this.posts.find(p => p.id === postId);
                if (post) {
                    post.reactions = data.reactions;
                    this.renderPosts();
                }
            }
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    }

    /**
     * Record views for visible posts
     */
    async recordVisiblePostViews() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const postId = parseInt(entry.target.dataset.postId);
                    this.recordView(postId);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.post-card').forEach(card => {
            observer.observe(card);
        });
    }

    /**
     * Record a post view
     */
    async recordView(postId) {
        try {
            await fetch(`/api/posts/${postId}/view`, {
                method: 'POST',
                headers: {
                    'Authorization': `User ${this.userId}`
                }
            });
        } catch (error) {
            console.error('Error recording view:', error);
        }
    }

    /**
     * Add new post to the feed
     */
    addNewPost(post) {
        this.posts.unshift(post);
        this.renderPosts();
    }

    /**
     * Update post in the feed
     */
    updatePost(updatedPost) {
        const index = this.posts.findIndex(p => p.id === updatedPost.id);
        if (index !== -1) {
            this.posts[index] = updatedPost;
            this.renderPosts();
        }
    }

    /**
     * Update post reactions
     */
    updatePostReactions(postId, reactions) {
        const post = this.posts.find(p => p.id === postId);
        if (post) {
            post.reactions = reactions;
            this.renderPosts();
        }
    }

    /**
     * Remove post from the feed
     */
    removePost(postId) {
        this.posts = this.posts.filter(p => p.id !== postId);
        this.renderPosts();
    }

    /**
     * Show new post indicator
     */
    showNewPostIndicator() {
        const indicator = document.getElementById('newPostIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    /**
     * Setup infinite scroll
     */
    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (this.loading || !this.hasMore) return;

            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.documentElement.scrollHeight - 500;

            if (scrollPosition >= threshold) {
                this.loadPosts();
            }
        });
    }

    /**
     * Setup pull-to-refresh
     */
    setupPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let pulling = false;

        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;

            if (diff > 80) {
                this.showRefreshIndicator();
            }
        });

        document.addEventListener('touchend', () => {
            if (!pulling) return;
            pulling = false;

            const diff = currentY - startY;
            if (diff > 80) {
                this.refreshFeed();
            }
            this.hideRefreshIndicator();
        });
    }

    /**
     * Refresh feed
     */
    async refreshFeed() {
        await this.loadPosts(true);
        this.hideNewPostIndicator();
    }

    /**
     * Show/hide indicators
     */
    showRefreshIndicator() {
        // Add visual feedback for pull-to-refresh
    }

    hideRefreshIndicator() {
        // Remove visual feedback
    }

    hideNewPostIndicator() {
        const indicator = document.getElementById('newPostIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    hideLoading() {
        const loading = document.getElementById('postsLoading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    showError(message) {
        // Show error toast
        console.error(message);
    }

    /**
     * Utility functions
     */
    getRelativeTime(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return past.toLocaleDateString();
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize on page load
let postsManager;
document.addEventListener('DOMContentLoaded', () => {
    postsManager = new PostsManager();
    postsManager.init();
});
