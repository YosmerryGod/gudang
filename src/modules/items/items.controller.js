
'use strict';

const itemsService = require('./items.service');

// [ADDED] Skema validasi untuk data barang.
const itemProperties = {
  name: { type: 'string', minLength: 1, maxLength: 150 },
  category_id: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
  unit: { type: 'string', minLength: 1, maxLength: 30 },
  initial_stock: { type: 'number', minimum: 0 },
  minimum_stock: { type: 'number', minimum: 0 },
  cost_price: { type: 'number', minimum: 0 },
  outgoing_price: { type: 'number', minimum: 0 },
  description: { anyOf: [{ type: 'string' }, { type: 'null' }] }
};

const createItemSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: [
      'name',
      'unit',
      'initial_stock',
      'minimum_stock',
      'cost_price',
      'outgoing_price'
    ],
    properties: itemProperties
  }
};

const updateItemSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    minProperties: 1,
    properties: {
      name: itemProperties.name,
      category_id: itemProperties.category_id,
      unit: itemProperties.unit,
      minimum_stock: itemProperties.minimum_stock,
      cost_price: itemProperties.cost_price,
      outgoing_price: itemProperties.outgoing_price,
      description: itemProperties.description
    }
  }
};

// [ADDED] Menangani error dari service secara konsisten.
function handleError(error, reply) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[ExGudang] Items API error:', error.message);
  }

  return reply.code(statusCode).send({
    success: false,
    message: statusCode >= 500
      ? 'Terjadi kesalahan pada server'
      : error.message
  });
}

async function itemsController(fastify) {
  // [ADDED] GET /api/items - daftar barang.
  fastify.get('/', {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          search: { type: 'string', maxLength: 150 },
          categoryId: { type: 'string', pattern: '^[1-9][0-9]*$' },
          stockStatus: {
            type: 'string',
            enum: ['low', 'available', 'empty']
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const filters = {
        search: request.query.search,
        categoryId: request.query.categoryId,
        stockStatus: request.query.stockStatus
      };

      const items = itemsService.getAllItems(filters);

      return {
        success: true,
        data: items,
        total: items.length
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] GET /api/items/:id - detail barang.
  fastify.get('/:id', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[1-9][0-9]*$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const item = itemsService.getItemById(request.params.id);

      return {
        success: true,
        data: item
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] POST /api/items - tambah barang.
  fastify.post('/', {
    preHandler: fastify.authenticate,
    schema: createItemSchema
  }, async (request, reply) => {
    try {
      const item = itemsService.createItem(request.body);

      return reply.code(201).send({
        success: true,
        message: 'Barang berhasil ditambahkan',
        data: item
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] PATCH /api/items/:id - edit informasi barang.
  fastify.patch('/:id', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[1-9][0-9]*$' }
        }
      },
      body: updateItemSchema.body
    }
  }, async (request, reply) => {
    try {
      const item = itemsService.updateItem(
        request.params.id,
        request.body
      );

      return {
        success: true,
        message: 'Informasi barang berhasil diperbarui',
        data: item
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // [ADDED] DELETE /api/items/:id - nonaktifkan barang.
  fastify.delete('/:id', {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', pattern: '^[1-9][0-9]*$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = itemsService.deactivateItem(request.params.id);

      return {
        success: true,
        message: result.message,
        data: result
      };
    } catch (error) {
      return handleError(error, reply);
    }
  });
}

module.exports = itemsController;
