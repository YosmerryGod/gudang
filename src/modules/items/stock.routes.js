
'use strict';

// [ADDED] Import controller transaksi stok.
const stockController = require('./stock.controller');

// [ADDED] Daftarkan endpoint stok masuk, stok keluar, dan riwayat.
async function stockRoutes(fastify) {
  await fastify.register(stockController);
}

module.exports = stockRoutes;
