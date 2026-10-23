
'use strict';

const reportsService = require('./reports.service');

// [ADDED] Validasi format tanggal YYYY-MM-DD.
function isValidDate(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

// [ADDED] Menangani error API laporan.
function handleError(error, reply) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[ExGudang] Reports API error:', error.message);
  }

  return reply.code(statusCode).send({
    success: false,
    message: statusCode >= 500
      ? 'Terjadi kesalahan pada server'
      : error.message
  });
}

async function reportsController(fastify) {
  // [ADDED] GET /api/reports/summary
  fastify.get('/summary', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const stock = reportsService.getStockSummary();

      return {
        success: true,
        data: {
          ...stock,
          estimated_stock_margin:
            Number(stock.total_stock_outgoing_value) -
            Number(stock.total_stock_cost_value)
        }
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] GET /api/reports/low-stock
  fastify.get('/low-stock', {
    preHandler: fastify.authenticate
  }, async (request, reply) => {
    try {
      const items = reportsService.getLowStockItems();

      return {
        success: true,
        data: items,
        total: items.length
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] GET /api/reports/movements
  fastify.get('/movements', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          startDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          endDate: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { startDate, endDate } = request.query;

      if (startDate && !isValidDate(startDate)) {
        return reply.code(400).send({
          success: false,
          message: 'Format startDate tidak valid'
        });
      }

      if (endDate && !isValidDate(endDate)) {
        return reply.code(400).send({
          success: false,
          message: 'Format endDate tidak valid'
        });
      }

      if (startDate && endDate && startDate > endDate) {
        return reply.code(400).send({
          success: false,
          message: 'startDate tidak boleh melewati endDate'
        });
      }

      const data = reportsService.getMovementSummary(
        startDate,
        endDate
      );

      return {
        success: true,
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        data
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] GET /api/reports/recent-movements
  fastify.get('/recent-movements', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = request.query.limit ?? 20;
      const movements = reportsService.getRecentMovements(limit);

      return {
        success: true,
        data: movements,
        total: movements.length
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = reportsController;
