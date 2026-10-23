
'use strict';

// [ADDED] Import authentication service
const authService = require('./auth.service');

// [ADDED] Register authentication controllers
async function authController(fastify) {
    // [ADDED] Admin login endpoint
    fastify.post('/login', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute'
            }
        },
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['username', 'password'],
                properties: {
                    username: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                    },
                    password: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 200
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { username, password } = request.body;

        const admin = await authService.verifyCredentials(
            username,
            password
        );

        if (!admin) {
            return reply.code(401).send({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const token = fastify.jwt.sign({
            sub: String(admin.id),
            username: admin.username,
            role: 'admin'
        });

        return reply.send({
            success: true,
            message: 'Login berhasil',
            data: {
                admin,
                token,
                tokenType: 'Bearer',
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        });
    });

    // [ADDED] Authenticated admin profile endpoint
    fastify.get('/me', {
        preHandler: fastify.authenticate
    }, async (request, reply) => {
        const admin = authService.getAdminById(
            Number(request.user.sub)
        );

        if (!admin) {
            return reply.code(401).send({
                success: false,
                message: 'Akun admin tidak ditemukan'
            });
        }

        return reply.send({
            success: true,
            data: admin
        });
    });
}

// [ADDED] Export controller
module.exports = authController;
