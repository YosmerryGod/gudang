
'use strict';

const { db } = require('../../config/database');

// [ADDED] Menghasilkan kode barang otomatis, contoh: BRG-000001.
function generateItemCode() {
  const result = db.prepare(`
    SELECT MAX(CAST(SUBSTR(code, 5) AS INTEGER)) AS last_number
    FROM items
    WHERE code GLOB 'BRG-[0-9]*'
  `).get();

  const nextNumber = Number(result?.last_number || 0) + 1;
  return `BRG-${String(nextNumber).padStart(6, '0')}`;
}

// [ADDED] Mengambil daftar barang dengan pencarian dan filter.
function getAllItems(filters = {}) {
  const conditions = ['i.is_active = 1'];
  const params = [];

  if (filters.search) {
    conditions.push('(i.name LIKE ? OR i.code LIKE ?)');
    const keyword = `%${filters.search}%`;
    params.push(keyword, keyword);
  }

  if (filters.categoryId !== undefined && filters.categoryId !== null && filters.categoryId !== '') {
    const categoryId = Number(filters.categoryId);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      const error = new Error('ID kategori tidak valid');
      error.statusCode = 400;
      throw error;
    }

    conditions.push('i.category_id = ?');
    params.push(categoryId);
  }

  if (filters.stockStatus === 'low') {
    conditions.push('i.current_stock <= i.minimum_stock');
  } else if (filters.stockStatus === 'available') {
    conditions.push('i.current_stock > 0');
  } else if (filters.stockStatus === 'empty') {
    conditions.push('i.current_stock = 0');
  }

  return db.prepare(`
    SELECT
      i.id,
      i.code,
      i.name,
      i.category_id,
      c.name AS category_name,
      i.unit,
      i.initial_stock,
      i.current_stock,
      i.minimum_stock,
      i.cost_price,
      i.outgoing_price,
      i.image_path,
      i.description,
      i.created_at,
      i.updated_at,
      CASE
        WHEN i.current_stock <= i.minimum_stock THEN 1
        ELSE 0
      END AS is_low_stock,
      (i.current_stock * i.cost_price) AS stock_cost_value,
      (i.current_stock * i.outgoing_price) AS stock_outgoing_value
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY i.name COLLATE NOCASE ASC
  `).all(...params);
}

// [ADDED] Mengambil detail satu barang.
function getItemById(id) {
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    const error = new Error('ID barang tidak valid');
    error.statusCode = 400;
    throw error;
  }

  const item = db.prepare(`
    SELECT
      i.*,
      c.name AS category_name,
      CASE
        WHEN i.current_stock <= i.minimum_stock THEN 1
        ELSE 0
      END AS is_low_stock,
      (i.current_stock * i.cost_price) AS stock_cost_value,
      (i.current_stock * i.outgoing_price) AS stock_outgoing_value
    FROM items i
    LEFT JOIN categories c ON c.id = i.category_id
    WHERE i.id = ?
      AND i.is_active = 1
  `).get(itemId);

  if (!item) {
    const error = new Error('Barang tidak ditemukan');
    error.statusCode = 404;
    throw error;
  }

  return item;
}

// [ADDED] Validasi data barang.
function validateItemData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Nama barang wajib diisi');
    } else if (data.name.trim().length > 150) {
      errors.push('Nama barang maksimal 150 karakter');
    }
  }

  if (!isUpdate || data.unit !== undefined) {
    if (typeof data.unit !== 'string' || !data.unit.trim()) {
      errors.push('Satuan barang wajib diisi');
    } else if (data.unit.trim().length > 30) {
      errors.push('Satuan barang maksimal 30 karakter');
    }
  }

  const numericFields = [
    'initial_stock',
    'minimum_stock',
    'cost_price',
    'outgoing_price'
  ];

  for (const field of numericFields) {
    if (isUpdate && data[field] === undefined) continue;

    const value = Number(data[field]);

    if (data[field] === undefined || data[field] === null || data[field] === '' ||
        !Number.isFinite(value) || value < 0) {
      errors.push(`${field} harus berupa angka yang tidak negatif`);
    }
  }

  if (data.category_id !== undefined && data.category_id !== null && data.category_id !== '') {
    const categoryId = Number(data.category_id);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      errors.push('Kategori tidak valid');
    }
  }

  if (data.description !== undefined && data.description !== null &&
      typeof data.description !== 'string') {
    errors.push('Deskripsi harus berupa teks');
  }

  if (errors.length > 0) {
    const error = new Error(errors.join('; '));
    error.statusCode = 400;
    throw error;
  }
}

// [ADDED] Memastikan kategori tersedia.
function validateCategory(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    return null;
  }

  const id = Number(categoryId);
  const category = db.prepare(`
    SELECT id FROM categories WHERE id = ?
  `).get(id);

  if (!category) {
    const error = new Error('Kategori tidak ditemukan');
    error.statusCode = 400;
    throw error;
  }

  return id;
}

// [ADDED] Membuat barang dan mencatat stok awal ke riwayat.
function createItem(data) {
  validateItemData(data);

  const categoryId = validateCategory(data.category_id);
  const name = data.name.trim();
  const unit = data.unit.trim();
  const initialStock = Number(data.initial_stock);
  const minimumStock = Number(data.minimum_stock);
  const costPrice = Number(data.cost_price);
  const outgoingPrice = Number(data.outgoing_price);
  const description = data.description?.trim() || null;

  db.exec('BEGIN IMMEDIATE');

  try {
    const code = generateItemCode();

    const result = db.prepare(`
      INSERT INTO items (
        code,
        name,
        category_id,
        unit,
        initial_stock,
        current_stock,
        minimum_stock,
        cost_price,
        outgoing_price,
        description,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      code,
      name,
      categoryId,
      unit,
      initialStock,
      initialStock,
      minimumStock,
      costPrice,
      outgoingPrice,
      description
    );

    const itemId = Number(result.lastInsertRowid);

    if (initialStock > 0) {
      db.prepare(`
        INSERT INTO stock_movements (
          item_id,
          movement_type,
          quantity,
          unit_cost,
          unit_outgoing_price,
          cost_total,
          outgoing_total,
          stock_before,
          stock_after,
          note,
          occurred_at,
          created_at
        ) VALUES (?, 'IN', ?, ?, ?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        itemId,
        initialStock,
        costPrice,
        outgoingPrice,
        initialStock * costPrice,
        initialStock * outgoingPrice,
        initialStock,
        'Stok awal barang',
        new Date().toISOString()
      );
    }

    db.exec('COMMIT');
    return getItemById(itemId);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// [ADDED] Memperbarui informasi barang tanpa mengubah stok berjalan.
function updateItem(id, data) {
  const itemId = Number(id);

  if (!Number.isInteger(itemId) || itemId <= 0) {
    const error = new Error('ID barang tidak valid');
    error.statusCode = 400;
    throw error;
  }

  const currentItem = getItemById(itemId);
  validateItemData(data, true);

  const name = data.name !== undefined ? data.name.trim() : currentItem.name;
  const categoryId = data.category_id !== undefined
    ? validateCategory(data.category_id)
    : currentItem.category_id;
  const unit = data.unit !== undefined ? data.unit.trim() : currentItem.unit;
  const minimumStock = data.minimum_stock !== undefined
    ? Number(data.minimum_stock)
    : currentItem.minimum_stock;
  const costPrice = data.cost_price !== undefined
    ? Number(data.cost_price)
    : currentItem.cost_price;
  const outgoingPrice = data.outgoing_price !== undefined
    ? Number(data.outgoing_price)
    : currentItem.outgoing_price;
  const description = data.description !== undefined
    ? (data.description?.trim() || null)
    : currentItem.description;

  db.prepare(`
    UPDATE items
    SET
      name = ?,
      category_id = ?,
      unit = ?,
      minimum_stock = ?,
      cost_price = ?,
      outgoing_price = ?,
      description = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_active = 1
  `).run(
    name,
    categoryId,
    unit,
    minimumStock,
    costPrice,
    outgoingPrice,
    description,
    itemId
  );

  return getItemById(itemId);
}

// [ADDED] Menonaktifkan barang tanpa menghapus riwayat transaksi.
function deactivateItem(id) {
  const item = getItemById(id);

  db.prepare(`
    UPDATE items
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(item.id);

  return {
    id: item.id,
    code: item.code,
    name: item.name,
    message: 'Barang berhasil dinonaktifkan'
  };
}

module.exports = {
  generateItemCode,
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deactivateItem
};
