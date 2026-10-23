
'use strict';

// [ADDED] Import controller laporan.
const reportsController = require('./reports.controller');

// [ADDED] Daftarkan endpoint laporan.
async function reportsRoutes(fastify) {
  await fastify.register(reportsController);
}

module.exports = reportsRoutes;
