/**
 * Session Store
 * Handles session persistence with Redis support for horizontal scaling
 * Falls back to in-memory storage for development
 */

const logger = require('./logger');

class SessionStore {
    constructor() {
        this.redisClient = null;
        this.memoryStore = new Map(); // Fallback for development
        this.isRedisConnected = false;

        // Try to connect to Redis if URL is provided
        if (process.env.REDIS_URL) {
            this.initializeRedis();
        } else {
            logger.warn('Redis URL not configured - using in-memory session storage (not suitable for production)');
        }
    }

    /**
     * Initialize Redis connection
     */
    async initializeRedis() {
        try {
            const Redis = require('ioredis');

            this.redisClient = new Redis(process.env.REDIS_URL, {
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
                    return delay;
                },
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true
            });

            // Event handlers
            this.redisClient.on('connect', () => {
                logger.info('Redis session store connecting...');
            });

            this.redisClient.on('ready', () => {
                this.isRedisConnected = true;
                logger.info('✓ Redis session store connected and ready');
            });

            this.redisClient.on('error', (error) => {
                this.isRedisConnected = false;
                logger.error('Redis session store error', { error: error.message });
            });

            this.redisClient.on('close', () => {
                this.isRedisConnected = false;
                logger.warn('Redis session store connection closed');
            });

            this.redisClient.on('reconnecting', () => {
                logger.info('Redis session store reconnecting...');
            });

            // Connect to Redis
            await this.redisClient.connect();

        } catch (error) {
            logger.error('Failed to initialize Redis session store', { error: error.message });
            logger.warn('Falling back to in-memory session storage');
            this.redisClient = null;
            this.isRedisConnected = false;
        }
    }

    /**
     * Set session data
     * @param {string} token - Session token
     * @param {Object} sessionData - Session data
     * @param {number} ttl - Time to live in milliseconds
     */
    async set(token, sessionData, ttl) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                // Store in Redis with TTL
                const ttlSeconds = Math.floor(ttl / 1000);
                await this.redisClient.setex(
                    `session:${token}`,
                    ttlSeconds,
                    JSON.stringify(sessionData)
                );
                logger.debug('Session stored in Redis', { token: token.substring(0, 8) });
            } else {
                // Store in memory
                this.memoryStore.set(token, {
                    data: sessionData,
                    expiresAt: Date.now() + ttl
                });
                logger.debug('Session stored in memory', { token: token.substring(0, 8) });
            }
            return true;
        } catch (error) {
            logger.error('Failed to set session', { error: error.message });
            // Fallback to memory store
            this.memoryStore.set(token, {
                data: sessionData,
                expiresAt: Date.now() + ttl
            });
            return false;
        }
    }

    /**
     * Get session data
     * @param {string} token - Session token
     * @returns {Object|null} Session data or null if not found/expired
     */
    async get(token) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                // Get from Redis
                const data = await this.redisClient.get(`session:${token}`);
                if (data) {
                    return JSON.parse(data);
                }
                return null;
            } else {
                // Get from memory
                const session = this.memoryStore.get(token);
                if (!session) {
                    return null;
                }

                // Check expiration
                if (Date.now() > session.expiresAt) {
                    this.memoryStore.delete(token);
                    return null;
                }

                return session.data;
            }
        } catch (error) {
            logger.error('Failed to get session', { error: error.message });
            return null;
        }
    }

    /**
     * Delete session
     * @param {string} token - Session token
     */
    async delete(token) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.del(`session:${token}`);
                logger.debug('Session deleted from Redis', { token: token.substring(0, 8) });
            } else {
                this.memoryStore.delete(token);
                logger.debug('Session deleted from memory', { token: token.substring(0, 8) });
            }
            return true;
        } catch (error) {
            logger.error('Failed to delete session', { error: error.message });
            return false;
        }
    }

    /**
     * Get all sessions for a specific username (for admin panel)
     * @param {string} username - Username
     * @returns {Array} Array of session objects
     */
    async getByUsername(username) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                // Scan Redis for all session keys
                const keys = await this.redisClient.keys('session:*');
                const sessions = [];

                for (const key of keys) {
                    const data = await this.redisClient.get(key);
                    if (data) {
                        const sessionData = JSON.parse(data);
                        if (sessionData.username === username) {
                            sessions.push(sessionData);
                        }
                    }
                }

                return sessions;
            } else {
                // Get from memory
                const sessions = [];
                const now = Date.now();

                for (const [token, session] of this.memoryStore.entries()) {
                    if (session.expiresAt > now && session.data.username === username) {
                        sessions.push(session.data);
                    }
                }

                return sessions;
            }
        } catch (error) {
            logger.error('Failed to get sessions by username', { error: error.message });
            return [];
        }
    }

    /**
     * Delete all sessions for a specific username
     * @param {string} username - Username
     */
    async deleteByUsername(username) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                // Scan Redis for all session keys
                const keys = await this.redisClient.keys('session:*');
                let deleted = 0;

                for (const key of keys) {
                    const data = await this.redisClient.get(key);
                    if (data) {
                        const sessionData = JSON.parse(data);
                        if (sessionData.username === username) {
                            await this.redisClient.del(key);
                            deleted++;
                        }
                    }
                }

                logger.audit('All sessions deleted for user', { username, count: deleted });
                return deleted;
            } else {
                // Delete from memory
                let deleted = 0;
                for (const [token, session] of this.memoryStore.entries()) {
                    if (session.data.username === username) {
                        this.memoryStore.delete(token);
                        deleted++;
                    }
                }

                logger.audit('All sessions deleted for user', { username, count: deleted });
                return deleted;
            }
        } catch (error) {
            logger.error('Failed to delete sessions by username', { error: error.message });
            return 0;
        }
    }

    /**
     * Cleanup expired sessions (for memory store)
     */
    async cleanupExpired() {
        try {
            if (!this.isRedisConnected) {
                // Redis auto-expires, only need to cleanup memory store
                const now = Date.now();
                let cleaned = 0;

                for (const [token, session] of this.memoryStore.entries()) {
                    if (session.expiresAt <= now) {
                        this.memoryStore.delete(token);
                        cleaned++;
                    }
                }

                if (cleaned > 0) {
                    logger.info('Cleaned up expired sessions from memory', { count: cleaned });
                }

                return cleaned;
            }
            return 0;
        } catch (error) {
            logger.error('Failed to cleanup expired sessions', { error: error.message });
            return 0;
        }
    }

    /**
     * Get session count
     */
    async getSessionCount() {
        try {
            if (this.isRedisConnected && this.redisClient) {
                const keys = await this.redisClient.keys('session:*');
                return keys.length;
            } else {
                // Count non-expired memory sessions
                const now = Date.now();
                let count = 0;
                for (const [token, session] of this.memoryStore.entries()) {
                    if (session.expiresAt > now) {
                        count++;
                    }
                }
                return count;
            }
        } catch (error) {
            logger.error('Failed to get session count', { error: error.message });
            return 0;
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            isRedisConnected: this.isRedisConnected,
            storageType: this.isRedisConnected ? 'redis' : 'memory',
            sessionCount: await this.getSessionCount()
        };
    }

    /**
     * Close connections
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit();
            logger.info('Redis session store connection closed');
        }
        this.memoryStore.clear();
    }
}

// Create singleton instance
const sessionStore = new SessionStore();

// Cleanup expired sessions every 15 minutes (for memory store)
setInterval(() => {
    sessionStore.cleanupExpired();
}, 15 * 60 * 1000);

module.exports = sessionStore;
