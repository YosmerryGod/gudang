
'use strict';

// [ADDED] Initial database schema for ExGudang
const migration = {
    version: 1,

    up(db) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                )
            );

            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                updated_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                )
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL COLLATE NOCASE UNIQUE,
                description TEXT,
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                updated_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                )
            );

            CREATE TABLE IF NOT EXISTS items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                category_id INTEGER,
                unit TEXT NOT NULL,
                initial_stock REAL NOT NULL DEFAULT 0
                    CHECK (initial_stock >= 0),
                current_stock REAL NOT NULL DEFAULT 0
                    CHECK (current_stock >= 0),
                minimum_stock REAL NOT NULL DEFAULT 0
                    CHECK (minimum_stock >= 0),
                cost_price REAL NOT NULL DEFAULT 0
                    CHECK (cost_price >= 0),
                outgoing_price REAL NOT NULL DEFAULT 0
                    CHECK (outgoing_price >= 0),
                image_path TEXT,
                description TEXT,
                is_active INTEGER NOT NULL DEFAULT 1
                    CHECK (is_active IN (0, 1)),
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                updated_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                FOREIGN KEY (category_id)
                    REFERENCES categories(id)
                    ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS stock_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL
                    CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
                quantity REAL NOT NULL
                    CHECK (quantity > 0),
                unit_cost REAL NOT NULL DEFAULT 0
                    CHECK (unit_cost >= 0),
                unit_outgoing_price REAL NOT NULL DEFAULT 0
                    CHECK (unit_outgoing_price >= 0),
                cost_total REAL NOT NULL DEFAULT 0
                    CHECK (cost_total >= 0),
                outgoing_total REAL NOT NULL DEFAULT 0
                    CHECK (outgoing_total >= 0),
                stock_before REAL NOT NULL
                    CHECK (stock_before >= 0),
                stock_after REAL NOT NULL
                    CHECK (stock_after >= 0),
                supplier TEXT,
                destination TEXT,
                note TEXT,
                occurred_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                created_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                ),
                FOREIGN KEY (item_id)
                    REFERENCES items(id)
                    ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (
                    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                )
            );

            CREATE INDEX IF NOT EXISTS idx_items_name
                ON items(name);

            CREATE INDEX IF NOT EXISTS idx_items_category
                ON items(category_id);

            CREATE INDEX IF NOT EXISTS idx_items_active
                ON items(is_active);

            CREATE INDEX IF NOT EXISTS idx_movements_item_date
                ON stock_movements(item_id, occurred_at);

            CREATE INDEX IF NOT EXISTS idx_movements_type_date
                ON stock_movements(movement_type, occurred_at);

            CREATE INDEX IF NOT EXISTS idx_movements_date
                ON stock_movements(occurred_at);
        `);

        const insertSetting = db.prepare(`
            INSERT OR IGNORE INTO settings (key, value)
            VALUES (?, ?)
        `);

        insertSetting.run('app_name', 'ExGudang');
        insertSetting.run('currency', 'IDR');
        insertSetting.run('timezone', 'Asia/Jakarta');
        insertSetting.run('stock_cost_method', 'WEIGHTED_AVERAGE');
    }
};

module.exports = migration;
