
'use strict';

const { db } = require('../../config/database');

// [ADDED] Ringkasan stok seluruh barang aktif.
function getStockSummary() {
  return db.prepare(`
    SELECT
      COUNT(*) AS total_items,
      COALESCE(SUM(current_stock), 0) AS total_stock_units,
      COALESCE(SUM(current_stock * cost_price), 0) AS total_stock_cost_value,
      COALESCE(SUM(current_stock * outgoing_price), 0) AS total_stock_outgoing_value,
      COALESCE(SUM(
        CASE
          WHEN current_stock <= minimum_stock THEN 1
          ELSE 0
        END
      ), 0) AS low_stock_items,
      COALESCE(SUM(
        CASE
          WHEN current_stock = 0 THEN 1
          ELSE 0
        END
      ), 0) AS empty_stock_items
    FROM items
    WHERE is_active = 1
  `).get();
}

// [ADDED] Daftar barang yang stoknya mencapai batas minimum.
function getLowStockItems() {
  return db.prepare(`
    SELECT
      id,
      code,
      name,
      unit,
      current_stock,
      minimum_stock,
      cost_price,
      outgoing_price
    FROM items
    WHERE is_active = 1
      AND current_stock <= minimum_stock
    ORDER BY current_stock ASC, name COLLATE NOCASE ASC
  `).all();
}

// [ADDED] Ringkasan transaksi berdasarkan tanggal.
function getMovementSummary(startDate, endDate) {
  const conditions = [];
  const params = [];

  if (startDate) {
    conditions.push("date(occurred_at) >= date(?)");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("date(occurred_at) <= date(?)");
    params.push(endDate);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return db.prepare(`
    SELECT
      COUNT(*) AS total_movements,
      COALESCE(SUM(
        CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END
      ), 0) AS total_in_quantity,
      COALESCE(SUM(
        CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END
      ), 0) AS total_out_quantity,
      COALESCE(SUM(
        CASE WHEN movement_type = 'IN' THEN cost_total ELSE 0 END
      ), 0) AS total_in_cost_value,
      COALESCE(SUM(
        CASE WHEN movement_type = 'OUT' THEN cost_total ELSE 0 END
      ), 0) AS total_out_cost_value,
      COALESCE(SUM(
        CASE WHEN movement_type = 'OUT' THEN outgoing_total ELSE 0 END
      ), 0) AS total_outgoing_value,
      COALESCE(SUM(
        CASE
          WHEN movement_type = 'OUT'
          THEN outgoing_total - cost_total
          ELSE 0
        END
      ), 0) AS estimated_profit
    FROM stock_movements
    ${whereClause}
  `).get(...params);
}

// [ADDED] Riwayat transaksi terbaru lintas barang.
function getRecentMovements(limit = 20) {
  const safeLimit = Number(limit);

  if (!Number.isInteger(safeLimit) || safeLimit < 1 || safeLimit > 100) {
    const error = new Error('Limit harus antara 1 dan 100');
    error.statusCode = 400;
    throw error;
  }

  return db.prepare(`
    SELECT
      sm.id,
      sm.item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      sm.movement_type,
      sm.quantity,
      sm.unit_cost,
      sm.unit_outgoing_price,
      sm.cost_total,
      sm.outgoing_total,
      sm.stock_before,
      sm.stock_after,
      sm.supplier,
      sm.destination,
      sm.note,
      sm.occurred_at
    FROM stock_movements sm
    JOIN items i ON i.id = sm.item_id
    ORDER BY sm.occurred_at DESC, sm.id DESC
    LIMIT ?
  `).all(safeLimit);
}

module.exports = {
  getStockSummary,
  getLowStockItems,
  getMovementSummary,
  getRecentMovements
};
