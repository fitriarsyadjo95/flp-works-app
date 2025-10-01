/**
 * YouTube Helper Functions
 * Convert YouTube URLs to embed format and handle video display
 */

class YouTubeHelper {
    /**
     * Extract YouTube video ID from various URL formats
     * Supports:
     * - https://www.youtube.com/watch?v=VIDEO_ID
     * - https://youtu.be/VIDEO_ID
     * - https://www.youtube.com/embed/VIDEO_ID
     */
    static extractVideoId(url) {
        if (!url) return null;

        // Already an embed URL
        if (url.includes('/embed/')) {
            const match = url.match(/\/embed\/([^?&]+)/);
            return match ? match[1] : null;
        }

        // Standard watch URL
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            return urlParams.get('v');
        }

        // Short URL
        if (url.includes('youtu.be/')) {
            const match = url.match(/youtu\.be\/([^?&]+)/);
            return match ? match[1] : null;
        }

        return null;
    }

    /**
     * Convert any YouTube URL to embed URL
     */
    static toEmbedUrl(url) {
        const videoId = this.extractVideoId(url);
        if (!videoId) return null;
        return `https://www.youtube.com/embed/${videoId}`;
    }

    /**
     * Get thumbnail URL for a YouTube video
     */
    static getThumbnailUrl(url, quality = 'maxresdefault') {
        const videoId = this.extractVideoId(url);
        if (!videoId) return null;

        // Quality options: default, mqdefault, hqdefault, sddefault, maxresdefault
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    }

    /**
     * Create an iframe element for embedding
     */
    static createIframe(url, options = {}) {
        const embedUrl = this.toEmbedUrl(url);
        if (!embedUrl) return null;

        const {
            width = '100%',
            height = '100%',
            autoplay = false,
            mute = false,
            controls = true,
            modestbranding = true,
            rel = false
        } = options;

        const params = new URLSearchParams({
            autoplay: autoplay ? 1 : 0,
            mute: mute ? 1 : 0,
            controls: controls ? 1 : 0,
            modestbranding: modestbranding ? 1 : 0,
            rel: rel ? 1 : 0
        });

        const iframe = document.createElement('iframe');
        iframe.src = `${embedUrl}?${params.toString()}`;
        iframe.width = width;
        iframe.height = height;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.className = 'w-full h-full rounded-lg';

        return iframe;
    }

    /**
     * Render YouTube video in a container
     */
    static renderVideo(containerId, videoUrl, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        const iframe = this.createIframe(videoUrl, options);
        if (!iframe) {
            container.innerHTML = '<div class="text-danger">Invalid YouTube URL</div>';
            return;
        }

        container.innerHTML = '';
        container.appendChild(iframe);
    }

    /**
     * Validate if URL is a valid YouTube URL
     */
    static isValidYouTubeUrl(url) {
        return this.extractVideoId(url) !== null;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeHelper;
}
