
'use strict';

const { db } = require('../../config/database');

// [ADDED] Membuat error dengan status HTTP.
function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// [ADDED] Memvalidasi ID barang dan jumlah transaksi.
function validateMovementInput(itemId, quantity) {
  const id = Number(itemId);
  const qty = Number(quantity);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError('ID barang tidak valid');
  }

  if (!Number.isFinite(qty) || qty <= 0) {
    throw createError('Jumlah transaksi harus lebih dari 0');
  }

  return { id, qty };
}

// [ADDED] Mengambil barang aktif.
function getActiveItem(itemId) {
  const item = db.prepare(`
    SELECT *
    FROM items
    WHERE id = ? AND is_active = 1
  `).get(itemId);

  if (!item) {
    throw createError('Barang tidak ditemukan atau sudah dinonaktifkan', 404);
  }

  return item;
}

// [ADDED] Memvalidasi harga transaksi.
function validatePrice(value, fieldName, fallback) {
  if (value === undefined || value === null || value === '') {
    return Number(fallback);
  }

  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    throw createError(`${fieldName} harus berupa angka yang tidak negatif`);
  }

  return price;
}

// [ADDED] Menjalankan transaksi database secara atomik.
function runTransaction(callback) {
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      console.error('[ExGudang] Rollback failed:', rollbackError.message);
    }

    throw error;
  }
}

// [ADDED] Stok masuk dan perhitungan harga modal rata-rata tertimbang.
function stockIn(itemId, data) {
  const { id, qty } = validateMovementInput(itemId, data.quantity);

  return runTransaction(() => {
    const item = getActiveItem(id);
    const stockBefore = Number(item.current_stock);
    const stockAfter = stockBefore + qty;

    if (!Number.isFinite(stockAfter)) {
      throw createError('Jumlah stok melebihi batas yang didukung');
    }

    const unitCost = validatePrice(
      data.unit_cost,
      'Harga modal',
      item.cost_price
    );

    const unitOutgoingPrice = validatePrice(
      data.unit_outgoing_price,
      'Harga keluar',
      item.outgoing_price
    );

    // [ADDED] Hitung rata-rata modal setelah stok masuk.
    const oldStockValue = stockBefore * Number(item.cost_price);
    const incomingStockValue = qty * unitCost;

    const averageCost = stockAfter > 0
      ? (oldStockValue + incomingStockValue) / stockAfter
      : unitCost;

    const occurredAt = data.occurred_at || new Date().toISOString();

    db.prepare(`
      UPDATE items
      SET
        current_stock = ?,
        cost_price = ?,
        outgoing_price = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      stockAfter,
      averageCost,
      unitOutgoingPrice,
      id
    );

    const movement = db.prepare(`
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
        supplier,
        destination,
        note,
        occurred_at,
        created_at
      ) VALUES (?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id,
      qty,
      unitCost,
      unitOutgoingPrice,
      qty * unitCost,
      qty * unitOutgoingPrice,
      stockBefore,
      stockAfter,
      data.supplier?.trim() || null,
      data.note?.trim() || 'Stok masuk',
      occurredAt
    );

    return {
      movement_id: Number(movement.lastInsertRowid),
      item_id: id,
      item_code: item.code,
      item_name: item.name,
      movement_type: 'IN',
      quantity: qty,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost: unitCost,
      average_cost_after: averageCost,
      unit_outgoing_price: unitOutgoingPrice,
      cost_total: qty * unitCost,
      outgoing_total: qty * unitOutgoingPrice,
      occurred_at: occurredAt
    };
  });
}

// [ADDED] Stok keluar dengan validasi agar stok tidak minus.
function stockOut(itemId, data) {
  const { id, qty } = validateMovementInput(itemId, data.quantity);

  return runTransaction(() => {
    const item = getActiveItem(id);
    const stockBefore = Number(item.current_stock);

    if (qty > stockBefore) {
      throw createError(
        `Stok tidak mencukupi. Stok tersedia: ${stockBefore}`
      );
    }

    const stockAfter = stockBefore - qty;
    const unitCost = Number(item.cost_price);

    const unitOutgoingPrice = validatePrice(
      data.unit_outgoing_price,
      'Harga keluar',
      item.outgoing_price
    );

    const costTotal = qty * unitCost;
    const outgoingTotal = qty * unitOutgoingPrice;
    const occurredAt = data.occurred_at || new Date().toISOString();

    db.prepare(`
      UPDATE items
      SET
        current_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(stockAfter, id);

    const movement = db.prepare(`
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
        supplier,
        destination,
        note,
        occurred_at,
        created_at
      ) VALUES (?, 'OUT', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      id,
      qty,
      unitCost,
      unitOutgoingPrice,
      costTotal,
      outgoingTotal,
      stockBefore,
      stockAfter,
      data.destination?.trim() || null,
      data.note?.trim() || 'Stok keluar',
      occurredAt
    );

    return {
      movement_id: Number(movement.lastInsertRowid),
      item_id: id,
      item_code: item.code,
      item_name: item.name,
      movement_type: 'OUT',
      quantity: qty,
      stock_before: stockBefore,
      stock_after: stockAfter,
      unit_cost: unitCost,
      unit_outgoing_price: unitOutgoingPrice,
      cost_total: costTotal,
      outgoing_total: outgoingTotal,
      estimated_profit: outgoingTotal - costTotal,
      occurred_at: occurredAt
    };
  });
}

// [ADDED] Mengambil riwayat transaksi suatu barang.
function getItemMovements(itemId, limit = 50, offset = 0) {
  const id = Number(itemId);
  const safeLimit = Number(limit);
  const safeOffset = Number(offset);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createError('ID barang tidak valid');
  }

  if (
    !Number.isInteger(safeLimit) ||
    safeLimit < 1 ||
    safeLimit > 200 ||
    !Number.isInteger(safeOffset) ||
    safeOffset < 0
  ) {
    throw createError('Parameter pagination tidak valid');
  }

  const item = db.prepare(`
    SELECT id FROM items WHERE id = ?
  `).get(id);

  if (!item) {
    throw createError('Barang tidak ditemukan', 404);
  }

  return db.prepare(`
    SELECT
      id,
      item_id,
      movement_type,
      quantity,
      unit_cost,
      unit_outgoing_price,
      cost_total,
      outgoing_total,
      stock_before,
      stock_after,
      supplier,
      destination,
      note,
      occurred_at,
      created_at
    FROM stock_movements
    WHERE item_id = ?
    ORDER BY occurred_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(id, safeLimit, safeOffset);
}

// [ADDED] Ekspor fungsi untuk digunakan controller.
module.exports = {
  stockIn,
  stockOut,
  getItemMovements
};
