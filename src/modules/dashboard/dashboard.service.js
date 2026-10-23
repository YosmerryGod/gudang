
'use strict';

const { db } = require('../../config/database');

// [ADDED] Mengambil tanggal awal bulan dalam waktu lokal Indonesia.
function getMonthStart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}-01`;
}

// [ADDED] Ringkasan dashboard untuk halaman Beranda.
function getDashboardSummary() {
  const stock = db.prepare(`
    SELECT
      COUNT(*) AS total_items,
      COALESCE(SUM(current_stock), 0) AS total_stock_units,
      COALESCE(SUM(current_stock * cost_price), 0) AS total_stock_cost_value,
      COALESCE(SUM(current_stock * outgoing_price), 0) AS total_stock_outgoing_value,
      COALESCE(SUM(
        CASE WHEN current_stock <= minimum_stock THEN 1 ELSE 0 END
      ), 0) AS low_stock_items,
      COALESCE(SUM(
        CASE WHEN current_stock = 0 THEN 1 ELSE 0 END
      ), 0) AS empty_stock_items
    FROM items
    WHERE is_active = 1
  `).get();

  const monthStart = getMonthStart();

  const monthly = db.prepare(`
    SELECT
      COUNT(*) AS total_movements,
      COALESCE(SUM(
        CASE WHEN movement_type = 'IN' THEN quantity ELSE 0 END
      ), 0) AS total_in_quantity,
      COALESCE(SUM(
        CASE WHEN movement_type = 'OUT' THEN quantity ELSE 0 END
      ), 0) AS total_out_quantity,
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
    WHERE date(occurred_at) >= date(?)
      AND date(occurred_at) <= date('now')
  `).get(monthStart);

  return {
    stock: {
      ...stock,
      estimated_stock_margin:
        Number(stock.total_stock_outgoing_value) -
        Number(stock.total_stock_cost_value)
    },
    monthly: {
      period_start: monthStart,
      ...monthly
    }
  };
}

// [ADDED] Mengambil 5 transaksi terakhir.
function getRecentMovements() {
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
      sm.note,
      sm.occurred_at
    FROM stock_movements sm
    JOIN items i ON i.id = sm.item_id
    ORDER BY sm.occurred_at DESC, sm.id DESC
    LIMIT 5
  `).all();
}

// [ADDED] Daftar barang yang perlu diperhatikan.
function getStockAlerts() {
  return db.prepare(`
    SELECT
      id,
      code,
      name,
      unit,
      current_stock,
      minimum_stock
    FROM items
    WHERE is_active = 1
      AND current_stock <= minimum_stock
    ORDER BY current_stock ASC, name COLLATE NOCASE ASC
    LIMIT 10
  `).all();
}

module.exports = {
  getDashboardSummary,
  getRecentMovements,
  getStockAlerts
};
