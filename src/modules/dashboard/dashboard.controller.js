
'use strict';

const dashboardService = require('./dashboard.service');

// [ADDED] Menangani error API dashboard.
function handleError(error, reply) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[ExGudang] Dashboard API error:', error.message);
  }

  return reply.code(statusCode).send({
    success: false,
    message: statusCode >= 500
      ? 'Terjadi kesalahan pada server'
      : error.message
  });
}

async function dashboardController(fastify) {
  // [ADDED] GET /api/dashboard
  fastify.get('/', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const summary = dashboardService.getDashboardSummary();
      const recentMovements = dashboardService.getRecentMovements();
      const stockAlerts = dashboardService.getStockAlerts();

      return {
        success: true,
        data: {
          summary,
          recent_movements: recentMovements,
          stock_alerts: stockAlerts
        }
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = dashboardController;
