
'use strict';

const Fastify = require('fastify');
const path = require('node:path');
const fastifyStatic = require('@fastify/static');

const authPlugin = require('./plugins/auth');
const authRoutes = require('./modules/auth/auth.routes');
const authService = require('./modules/auth/auth.service');
const categoriesRoutes = require('./modules/categories/categories.routes');
const itemsRoutes = require('./modules/items/items.routes');
const stockRoutes = require('./modules/items/stock.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info'
    },
    bodyLimit: 1024 * 1024,
    trustProxy: false
  });

  // [ADDED] Sajikan file frontend dari src/public.
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'public'),
    prefix: '/',
    index: false,
    wildcard: false
  });

  // [ADDED] Halaman utama web app.
  fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html');
  });

  // [ADDED] Pemeriksaan status backend.
  fastify.get('/api/health', async () => ({
    success: true,
    message: 'ExGudang API is running',
    timestamp: new Date().toISOString()
  }));

  // API aplikasi.
  fastify.register(async function initializeApplication(app) {
    await app.register(authPlugin);

    await app.register(authRoutes, {
      prefix: '/api/auth'
    });

    await app.register(categoriesRoutes, {
      prefix: '/api/categories'
    });

    await app.register(itemsRoutes, {
      prefix: '/api/items'
    });

    await app.register(stockRoutes, {
      prefix: '/api/items'
    });

    await app.register(reportsRoutes, {
      prefix: '/api/reports'
    });

    await app.register(dashboardRoutes, {
      prefix: '/api/dashboard'
    });
  });

  return fastify;
}

async function initializeApplication() {
  const admin = await authService.initializeAdmin();

  if (admin.created) {
    console.log(
      `[ExGudang] Initial admin account created: ${admin.username}`
    );
  } else {
    console.log(
      `[ExGudang] Admin account already exists: ${admin.username}`
    );
  }
}

module.exports = {
  buildApp,
  initializeApplication
};
