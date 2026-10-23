
'use strict';

// [ADDED] Import controller barang.
const itemsController = require('./items.controller');

// [ADDED] Daftarkan endpoint barang.
async function itemsRoutes(fastify) {
  await fastify.register(itemsController);
}

module.exports = itemsRoutes;
