
'use strict';

// [ADDED] Import category controller
const categoriesController = require('./categories.controller');

// [ADDED] Register category routes
async function categoriesRoutes(fastify) {
    await fastify.register(categoriesController);
}

// [ADDED] Export category routes
module.exports = categoriesRoutes;
