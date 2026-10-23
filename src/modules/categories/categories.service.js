
'use strict';

// [ADDED] Category service for ExGudang
const { db } = require('../../config/database');

// [ADDED] List categories with item counts
function getAllCategories() {
    return db.prepare(`
        SELECT
            c.id,
            c.name,
            c.description,
            c.created_at,
            c.updated_at,
            COUNT(i.id) AS item_count
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name COLLATE NOCASE ASC
    `).all();
}

// [ADDED] Get category by ID
function getCategoryById(id) {
    return db.prepare(`
        SELECT
            c.id,
            c.name,
            c.description,
            c.created_at,
            c.updated_at,
            COUNT(i.id) AS item_count
        FROM categories c
        LEFT JOIN items i ON i.category_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
    `).get(id) || null;
}

// [ADDED] Create category
function createCategory({ name, description = null }) {
    const normalizedName = name.trim();
    const normalizedDescription =
        typeof description === 'string' && description.trim()
            ? description.trim()
            : null;

    const existing = db.prepare(`
        SELECT id
        FROM categories
        WHERE name = ? COLLATE NOCASE
    `).get(normalizedName);

    if (existing) {
        const error = new Error('Kategori sudah tersedia');
        error.statusCode = 409;
        throw error;
    }

    const result = db.prepare(`
        INSERT INTO categories (name, description)
        VALUES (?, ?)
    `).run(normalizedName, normalizedDescription);

    return getCategoryById(Number(result.lastInsertRowid));
}

// [ADDED] Update category
function updateCategory(id, { name, description }) {
    const current = db.prepare(`
        SELECT id, name, description
        FROM categories
        WHERE id = ?
    `).get(id);

    if (!current) {
        const error = new Error('Kategori tidak ditemukan');
        error.statusCode = 404;
        throw error;
    }

    const normalizedName =
        name === undefined ? current.name : name.trim();

    const normalizedDescription =
        description === undefined
            ? current.description
            : (description.trim() || null);

    const duplicate = db.prepare(`
        SELECT id
        FROM categories
        WHERE name = ? COLLATE NOCASE
          AND id != ?
    `).get(normalizedName, id);

    if (duplicate) {
        const error = new Error('Nama kategori sudah digunakan');
        error.statusCode = 409;
        throw error;
    }

    db.prepare(`
        UPDATE categories
        SET
            name = ?,
            description = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
    `).run(normalizedName, normalizedDescription, id);

    return getCategoryById(id);
}

// [ADDED] Delete category only when no items use it
function deleteCategory(id) {
    const category = db.prepare(`
        SELECT id
        FROM categories
        WHERE id = ?
    `).get(id);

    if (!category) {
        const error = new Error('Kategori tidak ditemukan');
        error.statusCode = 404;
        throw error;
    }

    const itemCount = db.prepare(`
        SELECT COUNT(*) AS total
        FROM items
        WHERE category_id = ?
    `).get(id).total;

    if (itemCount > 0) {
        const error = new Error(
            'Kategori tidak dapat dihapus karena masih digunakan barang'
        );
        error.statusCode = 409;
        throw error;
    }

    db.prepare(`
        DELETE FROM categories
        WHERE id = ?
    `).run(id);

    return true;
}

// [ADDED] Export category service
module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
