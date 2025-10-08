/**
 * Signal Client - Real-time Trading Signal Handler
 * Connects to WebSocket server and manages signal display
 */

class SignalClient {
    constructor() {
        this.socket = null;
        this.signals = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Initialize WebSocket connection
     */
    connect() {
        try {
            // Connect to Socket.IO server
            const serverUrl = window.location.origin;
            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts
            });

            this.setupEventListeners();
            console.log('📡 Connecting to signal server...');

        } catch (error) {
            console.error('Failed to connect to signal server:', error);
            this.showConnectionError();
        }
    }

    /**
     * Setup Socket.IO event listeners
     */
    setupEventListeners() {
        // Connection successful
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            console.log('✓ Connected to signal server');
            this.updateConnectionStatus(true);
        });

        // Receive initial signals on connection
        this.socket.on('initial-signals', (signals) => {
            console.log(`📊 Received ${signals.length} active signals`);
            this.signals = signals;
            this.displaySignals(signals);
        });

        // Receive new signal
        this.socket.on('new-signal', (signal) => {
            console.log('🆕 New signal received:', signal.action, signal.pair);
            this.handleNewSignal(signal);
        });

        // Signal update (TP/SL hit)
        this.socket.on('signal-update', (signal) => {
            console.log('🔄 Signal updated:', signal.id, signal.status);
            this.handleSignalUpdate(signal);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false);
        });

        // Disconnected
        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            console.log('✗ Disconnected from signal server:', reason);
            this.updateConnectionStatus(false);

            if (reason === 'io server disconnect') {
                // Server disconnected, manually reconnect
                this.socket.connect();
            }
        });

        // Reconnecting
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            this.reconnectAttempts = attemptNumber;
            console.log(`Reconnection attempt ${attemptNumber}...`);
        });

        // Reconnected successfully
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✓ Reconnected after ${attemptNumber} attempts`);
            this.updateConnectionStatus(true);
        });
    }

    /**
     * Handle new signal received
     */
    handleNewSignal(signal) {
        // Add to signals array
        this.signals.unshift(signal);

        // Show notification
        if (typeof showToast === 'function') {
            showToast(`New ${signal.action} signal: ${signal.pair}`, 'success', 4000);
        }

        // Add to UI
        this.addSignalToUI(signal);

        // Play notification sound (optional)
        this.playNotificationSound();
    }

    /**
     * Handle signal update
     */
    handleSignalUpdate(signal) {
        // Update in signals array
        const index = this.signals.findIndex(s => s.id === signal.id);
        if (index !== -1) {
            this.signals[index] = signal;
        }

        // Update in UI
        this.updateSignalInUI(signal);

        // Show notification if closed
        if (signal.status !== 'active' && typeof showToast === 'function') {
            const message = signal.status === 'closed_win'
                ? `✅ ${signal.pair} hit TP! +${signal.profitPercent?.toFixed(2)}%`
                : `⚠️ ${signal.pair} hit SL! ${signal.profitPercent?.toFixed(2)}%`;
            const type = signal.status === 'closed_win' ? 'success' : 'error';
            showToast(message, type);
        }
    }

    /**
     * Display signals in UI (today's signals only)
     */
    displaySignals(signals) {
        const container = document.getElementById('liveSignalsContainer');
        const loading = document.getElementById('liveLoading');
        const empty = document.getElementById('liveEmpty');

        if (!container) return;

        // Hide loading
        if (loading) loading.classList.add('hidden');

        // Clear existing signals
        container.innerHTML = '';

        // Filter for today's signals only
        const todaySignals = this.filterTodaySignals(signals);

        // Show empty state if no signals
        if (todaySignals.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }

        // Hide empty state
        if (empty) empty.classList.add('hidden');

        // Display each signal
        todaySignals.forEach(signal => {
            this.addSignalToUI(signal);
        });
    }

    /**
     * Filter signals to only include today's signals
     */
    filterTodaySignals(signals) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return signals.filter(signal => {
            const signalDate = new Date(signal.createdAt || signal.created_at);
            signalDate.setHours(0, 0, 0, 0);
            return signalDate.getTime() === today.getTime();
        });
    }

    /**
     * Add signal card to UI
     */
    addSignalToUI(signal) {
        const container = document.getElementById('liveSignalsContainer');
        if (!container) return;

        // Check if signal is from today
        if (!this.isToday(signal.createdAt || signal.created_at)) {
            return; // Don't add signals from other days
        }

        const borderColor = signal.action === 'BUY' ? 'border-green-500' : 'border-red-500';
        const actionColor = signal.action === 'BUY' ? 'bg-green-500' : 'bg-red-500';
        const timeAgo = this.getRelativeTime(signal.createdAt);

        const signalCard = document.createElement('div');
        signalCard.className = `signal-card bg-gray-900 rounded-lg p-4 border-l-4 ${borderColor} mb-4 animate-fade-in`;
        signalCard.id = `signal-${signal.id}`;
        signalCard.dataset.signalId = signal.id;

        signalCard.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-base font-bold">${signal.pair}</h3>
                        <span class="${actionColor} text-black px-2 py-1 rounded-full text-xs font-bold">
                            ${signal.action}
                        </span>
                    </div>
                    <p class="text-gray-400 text-xs">🕐 ${timeAgo}</p>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-400">Risk</div>
                    <div class="text-primary font-bold">${signal.risk ? signal.risk + '%' : 'N/A'}</div>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-3 text-xs">
                <div>
                    <div class="text-gray-400">Entry</div>
                    <div class="font-semibold">${signal.entry}</div>
                </div>
                <div>
                    <div class="text-gray-400">Stop Loss</div>
                    <div class="font-semibold text-red-400">${signal.stopLoss}</div>
                </div>
                <div>
                    <div class="text-gray-400">Take Profit</div>
                    <div class="font-semibold text-green-400">${signal.takeProfit}</div>
                </div>
            </div>

            ${signal.confidence ? `
            <div class="mb-3">
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-gray-400">Confidence</span>
                    <span class="text-primary font-semibold">${signal.confidence}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="bg-primary h-2 rounded-full transition-all" style="width: ${signal.confidence}%"></div>
                </div>
            </div>
            ` : ''}

            ${signal.reasoning ? `
            <div class="text-xs text-gray-400 italic mb-3 p-2 bg-gray-800 rounded">
                ${this.escapeHtml(signal.reasoning)}
            </div>
            ` : ''}

            <div class="flex gap-2">
                <button onclick="signalClient.copySignal('${signal.id}')" class="flex-1 bg-gray-800 text-white py-2 px-4 rounded-lg text-xs font-medium hover:bg-gray-700 transition">
                    📋 Copy
                </button>
                <button onclick="signalClient.shareSignal('${signal.id}')" class="flex-1 bg-gray-800 text-white py-2 px-4 rounded-lg text-xs font-medium hover:bg-gray-700 transition">
                    🔗 Share
                </button>
            </div>
        `;

        // Insert at the top (newest first)
        container.insertBefore(signalCard, container.firstChild);

        // Add fade-in animation
        setTimeout(() => {
            signalCard.style.opacity = '1';
            signalCard.style.transform = 'translateY(0)';
        }, 10);
    }

    /**
     * Update existing signal in UI
     */
    updateSignalInUI(signal) {
        const signalCard = document.getElementById(`signal-${signal.id}`);
        if (!signalCard) return;

        // If signal is closed, move to history or update status
        if (signal.status !== 'active') {
            // Add status badge
            const statusBadge = document.createElement('div');
            statusBadge.className = `absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                signal.status === 'closed_win' ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
            }`;
            statusBadge.textContent = signal.status === 'closed_win' ? 'WIN' : 'LOSS';
            signalCard.style.position = 'relative';
            signalCard.appendChild(statusBadge);

            // Fade out after 5 seconds
            setTimeout(() => {
                signalCard.style.opacity = '0.5';
            }, 5000);
        }
    }

    /**
     * Copy signal details to clipboard
     */
    async copySignal(signalId) {
        const signal = this.signals.find(s => s.id === signalId);
        if (!signal) return;

        const text = `
📊 ${signal.pair} ${signal.action}
📈 Entry: ${signal.entry}
🛑 Stop Loss: ${signal.stopLoss}
🎯 Take Profit: ${signal.takeProfit}
${signal.confidence ? `💯 Confidence: ${signal.confidence}%` : ''}
${signal.risk ? `⚠️ Risk: ${signal.risk}%` : ''}
${signal.reasoning ? `\n💡 ${signal.reasoning}` : ''}
        `.trim();

        try {
            if (typeof copyToClipboard === 'function') {
                await copyToClipboard(text);
            } else {
                await navigator.clipboard.writeText(text);
            }
            showToast('Signal copied to clipboard!', 'success');
        } catch (error) {
            showToast('Failed to copy signal', 'error');
        }
    }

    /**
     * Share signal (use Web Share API if available)
     */
    async shareSignal(signalId) {
        const signal = this.signals.find(s => s.id === signalId);
        if (!signal) return;

        const text = `${signal.action} ${signal.pair} - Entry: ${signal.entry}, SL: ${signal.stopLoss}, TP: ${signal.takeProfit}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${signal.pair} Signal`,
                    text: text
                });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback to copy
            this.copySignal(signalId);
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            if (connected) {
                indicator.className = 'connection-status connected';
                indicator.innerHTML = '🟢 Live';
            } else {
                indicator.className = 'connection-status disconnected';
                indicator.innerHTML = '🔴 Offline';
            }
        }
    }

    /**
     * Show connection error message
     */
    showConnectionError() {
        if (typeof showToast === 'function') {
            showToast('Failed to connect to signal server', 'error');
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        // Optional: Add audio notification
        // const audio = new Audio('/assets/sounds/notification.mp3');
        // audio.play().catch(e => console.log('Audio play failed:', e));
    }

    /**
     * Get relative time string
     */
    getRelativeTime(dateString) {
        if (typeof getRelativeTime === 'function') {
            return getRelativeTime(dateString);
        }

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if a date is today
     */
    isToday(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('Disconnected from signal server');
        }
    }
}

// Create global instance
const signalClient = new SignalClient();

// Auto-connect when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        signalClient.connect();
    });
} else {
    signalClient.connect();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    signalClient.disconnect();
});

// Make available globally
window.signalClient = signalClient;
