
'use strict';

// [ADDED] Import category service
const categoriesService = require('./categories.service');

// [ADDED] Shared response schema for category objects
const categorySchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: ['string', 'null'] },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        item_count: { type: 'integer' }
    }
};

// [ADDED] Register category controllers
async function categoriesController(fastify) {
    // [ADDED] List all categories
    fastify.get('/', {
        preHandler: fastify.authenticate
    }, async (request, reply) => {
        return reply.send({
            success: true,
            data: categoriesService.getAllCategories()
        });
    });

    // [ADDED] Get category details
    fastify.get('/:id', {
        preHandler: fastify.authenticate,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[1-9][0-9]*$'
                    }
                }
            }
        }
    }, async (request, reply) => {
        const category = categoriesService.getCategoryById(
            Number(request.params.id)
        );

        if (!category) {
            return reply.code(404).send({
                success: false,
                message: 'Kategori tidak ditemukan'
            });
        }

        return reply.send({
            success: true,
            data: category
        });
    });

    // [ADDED] Create category
    fastify.post('/', {
        preHandler: fastify.authenticate,
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                required: ['name'],
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                    },
                    description: {
                        type: ['string', 'null'],
                        maxLength: 500
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const category = categoriesService.createCategory(
                request.body
            );

            return reply.code(201).send({
                success: true,
                message: 'Kategori berhasil ditambahkan',
                data: category
            });
        } catch (error) {
            return reply.code(error.statusCode || 500).send({
                success: false,
                message: error.statusCode
                    ? error.message
                    : 'Gagal menambahkan kategori'
            });
        }
    });

    // [ADDED] Update category
    fastify.patch('/:id', {
        preHandler: fastify.authenticate,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[1-9][0-9]*$'
                    }
                }
            },
            body: {
                type: 'object',
                additionalProperties: false,
                minProperties: 1,
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                    },
                    description: {
                        type: ['string', 'null'],
                        maxLength: 500
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const category = categoriesService.updateCategory(
                Number(request.params.id),
                request.body
            );

            return reply.send({
                success: true,
                message: 'Kategori berhasil diperbarui',
                data: category
            });
        } catch (error) {
            return reply.code(error.statusCode || 500).send({
                success: false,
                message: error.statusCode
                    ? error.message
                    : 'Gagal memperbarui kategori'
            });
        }
    });

    // [ADDED] Delete category
    fastify.delete('/:id', {
        preHandler: fastify.authenticate,
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        pattern: '^[1-9][0-9]*$'
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            categoriesService.deleteCategory(
                Number(request.params.id)
            );

            return reply.send({
                success: true,
                message: 'Kategori berhasil dihapus'
            });
        } catch (error) {
            return reply.code(error.statusCode || 500).send({
                success: false,
                message: error.statusCode
                    ? error.message
                    : 'Gagal menghapus kategori'
            });
        }
    });
}

// [ADDED] Export category controller
module.exports = categoriesController;
