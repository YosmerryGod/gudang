
'use strict';

const stockService = require('./stock.service');

// [ADDED] Validasi input transaksi stok.
const movementBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['quantity'],
  properties: {
    quantity: {
      type: 'number',
      exclusiveMinimum: 0
    },
    unit_cost: {
      type: 'number',
      minimum: 0
    },
    unit_outgoing_price: {
      type: 'number',
      minimum: 0
    },
    supplier: {
      type: 'string',
      maxLength: 150
    },
    destination: {
      type: 'string',
      maxLength: 150
    },
    note: {
      type: 'string',
      maxLength: 500
    },
    occurred_at: {
      type: 'string',
      format: 'date-time'
    }
  }
};

// [ADDED] Format error API.
function handleError(error, reply) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[ExGudang] Stock API error:', error.message);
  }

  return reply.code(statusCode).send({
    success: false,
    message: statusCode >= 500
      ? 'Terjadi kesalahan pada server'
      : error.message
  });
}

// [ADDED] Validasi parameter ID barang.
const itemIdParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[1-9][0-9]*$'
    }
  }
};

async function stockController(fastify) {
  // [ADDED] POST /api/items/:id/stock-in
  fastify.post('/:id/stock-in', {
    preHandler: fastify.authenticate,
    schema: {
      params: itemIdParamsSchema,
      body: movementBodySchema
    }
  }, async (request, reply) => {
    try {
      const result = stockService.stockIn(
        request.params.id,
        request.body
      );

      return reply.code(201).send({
        success: true,
        message: 'Stok masuk berhasil dicatat',
        data: result
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] POST /api/items/:id/stock-out
  fastify.post('/:id/stock-out', {
    preHandler: fastify.authenticate,
    schema: {
      params: itemIdParamsSchema,
      body: movementBodySchema
    }
  }, async (request, reply) => {
    try {
      const result = stockService.stockOut(
        request.params.id,
        request.body
      );

      return reply.code(201).send({
        success: true,
        message: 'Stok keluar berhasil dicatat',
        data: result
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] GET /api/items/:id/movements
  fastify.get('/:id/movements', {
    preHandler: fastify.authenticate,
    schema: {
      params: itemIdParamsSchema,
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 200,
            default: 50
          },
          offset: {
            type: 'integer',
            minimum: 0,
            default: 0
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const limit = request.query.limit ?? 50;
      const offset = request.query.offset ?? 0;

      const movements = stockService.getItemMovements(
        request.params.id,
        limit,
        offset
      );

      return {
        success: true,
        data: movements,
        total: movements.length,
        limit,
        offset
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = stockController;
