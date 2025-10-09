/**
 * Unit Tests for Admin Authentication
 */

const bcrypt = require('bcrypt');

describe('AdminAuth', () => {
    let adminAuth;

    beforeAll(() => {
        // Set test environment variables
        process.env.ADMIN_USERNAME = 'testadmin';
        process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('TestPassword123', 12);
        process.env.ADMIN_EMAIL = 'test@example.com';
        process.env.SESSION_DURATION = '3600000'; // 1 hour

        // Require adminAuth after setting env vars
        adminAuth = require('../../server/admin-auth');
    });

    describe('Password Hashing', () => {
        it('should hash passwords with bcrypt', async () => {
            const password = 'TestPassword123';
            const hash = await adminAuth.hashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.startsWith('$2b$')).toBe(true);
        });

        it('should verify correct passwords', async () => {
            const password = 'TestPassword123';
            const hash = await adminAuth.hashPassword(password);
            const isValid = await adminAuth.verifyPassword(password, hash);

            expect(isValid).toBe(true);
        });

        it('should reject incorrect passwords', async () => {
            const password = 'TestPassword123';
            const hash = await adminAuth.hashPassword(password);
            const isValid = await adminAuth.verifyPassword('WrongPassword', hash);

            expect(isValid).toBe(false);
        });
    });

    describe('Login', () => {
        it('should successfully login with correct credentials', async () => {
            const result = await adminAuth.login('testadmin', 'TestPassword123', '127.0.0.1');

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.token).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.user.username).toBe('testadmin');
        });

        it('should fail login with incorrect password', async () => {
            const result = await adminAuth.login('testadmin', 'WrongPassword', '127.0.0.1');

            expect(result).toBeNull();
        });

        it('should fail login with unknown username', async () => {
            const result = await adminAuth.login('unknown', 'TestPassword123', '127.0.0.1');

            expect(result).toBeNull();
        });
    });

    describe('Session Management', () => {
        it('should validate active sessions', async () => {
            const loginResult = await adminAuth.login('testadmin', 'TestPassword123', '127.0.0.1');
            const session = adminAuth.validateSession(loginResult.token);

            expect(session).toBeDefined();
            expect(session.username).toBe('testadmin');
        });

        it('should reject invalid tokens', () => {
            const session = adminAuth.validateSession('invalid-token');

            expect(session).toBeNull();
        });

        it('should logout successfully', async () => {
            const loginResult = await adminAuth.login('testadmin', 'TestPassword123', '127.0.0.1');
            const logoutResult = adminAuth.logout(loginResult.token);

            expect(logoutResult).toBe(true);

            // Session should be invalid after logout
            const session = adminAuth.validateSession(loginResult.token);
            expect(session).toBeNull();
        });
    });

    describe('Security', () => {
        it('should generate unique session tokens', async () => {
            const token1 = adminAuth.generateSessionToken();
            const token2 = adminAuth.generateSessionToken();

            expect(token1).not.toBe(token2);
            expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
        });

        it('should enforce minimum password length for new admins', async () => {
            const result = await adminAuth.createAdmin({
                username: 'newadmin',
                password: 'short',
                email: 'new@example.com'
            }, 'super_admin');

            expect(result.success).toBe(false);
            expect(result.error).toContain('12 characters');
        });
    });
});
