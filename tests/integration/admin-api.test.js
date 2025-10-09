/**
 * Integration Tests for Admin API
 */

const request = require('supertest');
const bcrypt = require('bcrypt');

describe('Admin API Integration Tests', () => {
    let app;
    let server;

    beforeAll(() => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.PORT = '5002'; // Use different port for testing
        process.env.ADMIN_USERNAME = 'testadmin';
        process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('TestPassword123!', 12);
        process.env.ADMIN_EMAIL = 'test@example.com';
        process.env.SIGNAL_API_KEY = 'test-api-key';
        process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

        // Load app after setting env vars
        delete require.cache[require.resolve('../../server.js')];
        app = require('../../server.js');
    });

    afterAll((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('POST /api/admin/login', () => {
        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/admin/login')
                .send({
                    username: 'testadmin',
                    password: 'TestPassword123!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toBeDefined();
            expect(response.body.user.username).toBe('testadmin');
            expect(response.body.user.role).toBe('super_admin');
        });

        it('should reject invalid credentials', async () => {
            const response = await request(app)
                .post('/api/admin/login')
                .send({
                    username: 'testadmin',
                    password: 'WrongPassword'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });

        it('should reject missing credentials', async () => {
            const response = await request(app)
                .post('/api/admin/login')
                .send({})
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('required');
        });
    });

    describe('GET /api/admin/validate', () => {
        let authToken;

        beforeAll(async () => {
            // Login to get a valid token
            const loginResponse = await request(app)
                .post('/api/admin/login')
                .send({
                    username: 'testadmin',
                    password: 'TestPassword123!'
                });

            authToken = loginResponse.body.token;
        });

        it('should validate session with valid token', async () => {
            const response = await request(app)
                .get('/api/admin/validate')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.admin).toBeDefined();
            expect(response.body.admin.username).toBe('testadmin');
        });

        it('should reject invalid token', async () => {
            const response = await request(app)
                .get('/api/admin/validate')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject missing token', async () => {
            const response = await request(app)
                .get('/api/admin/validate')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/admin/logout', () => {
        let authToken;

        beforeEach(async () => {
            // Login to get a fresh token
            const loginResponse = await request(app)
                .post('/api/admin/login')
                .send({
                    username: 'testadmin',
                    password: 'TestPassword123!'
                });

            authToken = loginResponse.body.token;
        });

        it('should logout successfully', async () => {
            const response = await request(app)
                .post('/api/admin/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Logged out');

            // Token should be invalid after logout
            const validateResponse = await request(app)
                .get('/api/admin/validate')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(401);

            expect(validateResponse.body.success).toBe(false);
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce login rate limit', async () => {
            const promises = [];

            // Make 10 failed login attempts (limit is 5)
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/admin/login')
                        .send({
                            username: 'testadmin',
                            password: 'WrongPassword' + i
                        })
                );
            }

            const responses = await Promise.all(promises);

            // Some requests should be rate limited (429)
            const rateLimited = responses.filter(r => r.status === 429);
            expect(rateLimited.length).toBeGreaterThan(0);
        }, 10000); // Increase timeout for rate limit test
    });
});
