
'use strict';

// [ADDED] Import authentication controller
const authController = require('./auth.controller');

// [ADDED] Register authentication routes
async function authRoutes(fastify) {
    await fastify.register(authController);
}

// [ADDED] Export routes
module.exports = authRoutes;
