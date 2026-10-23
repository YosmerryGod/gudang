
'use strict';

// [ADDED] Import controller dashboard.
const dashboardController = require('./dashboard.controller');

// [ADDED] Daftarkan endpoint dashboard.
async function dashboardRoutes(fastify) {
  await fastify.register(dashboardController);
}

module.exports = dashboardRoutes;
