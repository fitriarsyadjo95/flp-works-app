/**
 * Sentry Error Monitoring Integration
 * Tracks errors, performance, and provides real-time alerts
 */

const Sentry = require('@sentry/node');
const logger = require('./logger');

class SentryMonitoring {
    constructor() {
        this.isEnabled = false;
        this.isInitialized = false;
    }

    /**
     * Initialize Sentry
     */
    init() {
        const dsn = process.env.SENTRY_DSN;
        const environment = process.env.NODE_ENV || 'development';

        // Skip initialization if no DSN provided
        if (!dsn) {
            logger.info('Sentry DSN not configured - error monitoring disabled');
            logger.info('To enable Sentry: Set SENTRY_DSN environment variable');
            return false;
        }

        try {
            Sentry.init({
                dsn,
                environment,

                // Performance monitoring
                tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

                // Release tracking
                release: process.env.SENTRY_RELEASE || 'flp-academyworks@1.0.0',

                // Server name
                serverName: process.env.HOSTNAME || 'flp-server',

                // Debug mode
                debug: environment === 'development',

                // Integrations
                integrations: [
                    // Express integration
                    new Sentry.Integrations.Http({ tracing: true }),
                    new Sentry.Integrations.Express({ app: true }),
                    // OnUncaughtException integration
                    new Sentry.Integrations.OnUncaughtException({
                        exitEvenIfOtherHandlersAreRegistered: false
                    }),
                    new Sentry.Integrations.OnUnhandledRejection({ mode: 'warn' })
                ],

                // Filter sensitive data
                beforeSend(event, hint) {
                    // Remove sensitive headers
                    if (event.request?.headers) {
                        delete event.request.headers.authorization;
                        delete event.request.headers['x-csrf-token'];
                        delete event.request.headers.cookie;
                    }

                    // Remove sensitive data from breadcrumbs
                    if (event.breadcrumbs) {
                        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
                            if (breadcrumb.data?.password) {
                                breadcrumb.data.password = '***REDACTED***';
                            }
                            if (breadcrumb.data?.token) {
                                breadcrumb.data.token = '***REDACTED***';
                            }
                            return breadcrumb;
                        });
                    }

                    return event;
                },

                // Ignore certain errors
                ignoreErrors: [
                    // Browser errors
                    'top.GLOBALS',
                    'originalCreateNotification',
                    'canvas.contentDocument',
                    'MyApp_RemoveAllHighlights',
                    'Can\'t find variable: ZiteReader',
                    'jigsaw is not defined',
                    'ComboSearch is not defined',
                    // Network errors
                    'NetworkError',
                    'Network request failed',
                    // Rate limiting
                    'Too many requests'
                ]
            });

            this.isEnabled = true;
            this.isInitialized = true;

            logger.info('✓ Sentry error monitoring initialized', {
                environment,
                tracesSampleRate: environment === 'production' ? 0.1 : 1.0
            });

            return true;

        } catch (error) {
            logger.error('Failed to initialize Sentry', { error: error.message });
            return false;
        }
    }

    /**
     * Express request handler (must be first middleware)
     */
    requestHandler() {
        if (!this.isEnabled) {
            return (req, res, next) => next();
        }
        return Sentry.Handlers.requestHandler();
    }

    /**
     * Express tracing handler
     */
    tracingHandler() {
        if (!this.isEnabled) {
            return (req, res, next) => next();
        }
        return Sentry.Handlers.tracingHandler();
    }

    /**
     * Express error handler (must be before other error handlers)
     */
    errorHandler() {
        if (!this.isEnabled) {
            return (err, req, res, next) => next(err);
        }
        return Sentry.Handlers.errorHandler({
            shouldHandleError(error) {
                // Capture all errors with status code >= 500
                return error.status >= 500;
            }
        });
    }

    /**
     * Capture exception manually
     */
    captureException(error, context = {}) {
        if (!this.isEnabled) {
            return null;
        }

        return Sentry.captureException(error, {
            extra: context
        });
    }

    /**
     * Capture message
     */
    captureMessage(message, level = 'info', context = {}) {
        if (!this.isEnabled) {
            return null;
        }

        return Sentry.captureMessage(message, {
            level,
            extra: context
        });
    }

    /**
     * Set user context
     */
    setUser(user) {
        if (!this.isEnabled) {
            return;
        }

        Sentry.setUser({
            id: user.id,
            username: user.username,
            email: user.email,
            ip_address: user.ipAddress
        });
    }

    /**
     * Clear user context
     */
    clearUser() {
        if (!this.isEnabled) {
            return;
        }

        Sentry.setUser(null);
    }

    /**
     * Add breadcrumb
     */
    addBreadcrumb(breadcrumb) {
        if (!this.isEnabled) {
            return;
        }

        Sentry.addBreadcrumb(breadcrumb);
    }

    /**
     * Set context
     */
    setContext(key, value) {
        if (!this.isEnabled) {
            return;
        }

        Sentry.setContext(key, value);
    }

    /**
     * Start transaction (for performance monitoring)
     */
    startTransaction(name, op) {
        if (!this.isEnabled) {
            return null;
        }

        return Sentry.startTransaction({
            name,
            op
        });
    }

    /**
     * Close Sentry connection gracefully
     */
    async close(timeout = 2000) {
        if (!this.isEnabled) {
            return;
        }

        try {
            await Sentry.close(timeout);
            logger.info('Sentry connection closed');
        } catch (error) {
            logger.error('Error closing Sentry connection', { error: error.message });
        }
    }

    /**
     * Health check
     */
    healthCheck() {
        return {
            enabled: this.isEnabled,
            initialized: this.isInitialized,
            dsn: process.env.SENTRY_DSN ? '***CONFIGURED***' : 'NOT_SET'
        };
    }
}

// Create singleton instance
const sentryMonitoring = new SentryMonitoring();

module.exports = sentryMonitoring;
