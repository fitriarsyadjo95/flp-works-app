/**
 * Trading Platform Launcher
 * Provides functionality to open MT4/MT5 apps across all pages
 */

// Trading Platform Function
function openTradingPlatform() {
    // Show platform selection modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-bg-elevated rounded-xl p-6 w-full max-w-sm shadow-elevated border border-separator/20">
            <div class="w-9 h-1 bg-fill-primary rounded-full mx-auto mb-4"></div>
            <h3 class="text-label-primary text-base font-sf-display font-semibold mb-2 text-center">Choose Trading Platform</h3>

            <!-- Notice -->
            <div class="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-5">
                <div class="flex gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-primary flex-shrink-0 mt-0.5">
                        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"></path>
                    </svg>
                    <div>
                        <div class="text-primary text-xs font-semibold mb-1">Important Notice</div>
                        <div class="text-label-secondary text-xs leading-relaxed">Please ensure you have MetaTrader 4 or MetaTrader 5 installed on your device before proceeding.</div>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                <button onclick="openPlatform('mt4')" class="w-full bg-info text-bg py-3.5 rounded-lg font-sf-ui font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
                        <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path>
                    </svg>
                    Open MetaTrader 4
                </button>
                <button onclick="openPlatform('mt5')" class="w-full bg-success text-bg py-3.5 rounded-lg font-sf-ui font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-5 h-5">
                        <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"></path>
                    </svg>
                    Open MetaTrader 5
                </button>
                <button onclick="closeModal()" class="w-full bg-fill-secondary text-label-primary py-3 rounded-lg font-sf-ui font-medium active:scale-[0.98] transition-all">
                    Cancel
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal function
    window.closeModal = function() {
        if (modal && modal.parentNode) {
            document.body.removeChild(modal);
        }
    }

    // Open platform function
    window.openPlatform = function(platform) {
        const url = platform === 'mt4' ? 'mt4://' : 'mt5://';
        window.location.href = url;
        setTimeout(() => closeModal(), 500);
    }

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.openTradingPlatform = openTradingPlatform;
}
