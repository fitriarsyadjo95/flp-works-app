/**
 * Shared Tailwind CSS Configuration
 * iOS-inspired dark mode design tokens and theme configuration
 */

window.tailwindConfig = {
    theme: {
        extend: {
            colors: {
                // Brand colors from design.json
                primary: '#FFD60A',
                success: '#32D74B',
                warning: '#FFD60A',
                danger: '#FF453A',
                info: '#64D2FF',

                // Background colors
                bg: '#0B0B0F',
                'bg-elevated': '#141417',
                'bg-secondary': '#1C1C1F',
                'bg-tertiary': '#2C2C2E',

                // Text colors
                'label-primary': '#FFFFFF',
                'label-secondary': 'rgba(235,235,245,0.6)',
                'label-tertiary': 'rgba(235,235,245,0.3)',
                'label-quaternary': 'rgba(235,235,245,0.18)',

                // Fill colors
                'fill-primary': 'rgba(120,120,128,0.36)',
                'fill-secondary': 'rgba(120,120,128,0.32)',
                'fill-tertiary': 'rgba(120,120,128,0.24)',

                // Interaction colors
                separator: 'rgba(84,84,88,0.36)',
                overlay: 'rgba(0,0,0,0.6)',
                'focus-ring': 'rgba(255,214,10,0.45)',

                // Trading colors
                'chart-up': '#32D74B',
                'chart-down': '#FF453A',
                buy: '#32D74B',
                sell: '#FF453A'
            },
            fontFamily: {
                'sf-ui': ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Arial', 'sans-serif'],
                'sf-display': ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Arial', 'sans-serif'],
                'sf-mono': ['SF Mono', 'ui-monospace', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
                'sf-pro': ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Arial', 'sans-serif']
            },
            fontSize: {
                'xs': ['11px', { lineHeight: '1.2' }],
                'sm': ['13px', { lineHeight: '1.2' }],
                'md': ['15px', { lineHeight: '1.2' }],
                'lg': ['17px', { lineHeight: '1.2' }],
                'xl': ['20px', { lineHeight: '1.2' }],
                '2xl': ['28px', { lineHeight: '1.1' }],
                '3xl': ['34px', { lineHeight: '1.0' }]
            },
            borderRadius: {
                'xs': '8px',
                'sm': '10px',
                'md': '12px',
                'lg': '16px',
                'xl': '22px',
                'pill': '999px'
            },
            boxShadow: {
                'soft': '0 2px 8px rgba(0,0,0,0.35)',
                'elevated': '0 8px 24px rgba(0,0,0,0.45)',
                'card': '0 2px 8px rgba(0,0,0,0.1)',
                'button': '0 1px 3px rgba(0,0,0,0.12)',
                'modal': '0 8px 32px rgba(0,0,0,0.24)'
            },
            backdropBlur: {
                'system-thin': '20px',
                'system-thick': '30px'
            },
            animation: {
                'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce': 'bounce 1s infinite'
            }
        }
    }
};

// Apply Tailwind config immediately if tailwind is loaded
if (typeof tailwind !== 'undefined' && tailwind.config) {
    tailwind.config = window.tailwindConfig;
}
