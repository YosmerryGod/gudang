
'use strict';

// [MODIFIED] Import JWT and Fastify plugin utilities
const jwt = require('@fastify/jwt');
const fp = require('fastify-plugin');

// [MODIFIED] Register JWT and expose authentication decorators
async function authPlugin(fastify) {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error(
            'JWT_SECRET must be configured with at least 32 characters'
        );
    }

    // [MODIFIED] Register JWT directly in the current Fastify context
    await fastify.register(jwt, {
        secret,
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
    });

    // [ADDED] Ensure JWT decorator is available
    if (!fastify.jwt) {
        throw new Error('JWT plugin failed to initialize');
    }

    // [ADDED] Register authentication decorator
    fastify.decorate(
        'authenticate',
        async function authenticate(request, reply) {
            try {
                await request.jwtVerify();
            } catch (error) {
                return reply.code(401).send({
                    success: false,
                    message: 'Authentication required or token is invalid'
                });
            }

            // [ADDED] Validate administrator token claims
            if (
                !request.user ||
                request.user.role !== 'admin' ||
                !Number.isInteger(Number(request.user.sub))
            ) {
                return reply.code(401).send({
                    success: false,
                    message: 'Invalid authentication token'
                });
            }
        }
    );
}

// [MODIFIED] Expose decorators without declaring an incorrect dependency
module.exports = fp(authPlugin, {
    name: 'exgudang-auth'
});
