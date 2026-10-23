
'use strict';

// [MODIFIED] Load database and initial schema migration
const { db } = require('../config/database');
const initialSchema = require('./migrations/001_initial_schema');

// [MODIFIED] Run migrations using node:sqlite DatabaseSync
function runMigrations() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            )
        )
    `);

    const applied = db.prepare(`
        SELECT version
        FROM schema_migrations
        WHERE version = ?
    `);

    const recordMigration = db.prepare(`
        INSERT INTO schema_migrations (version)
        VALUES (?)
    `);

    const migrations = [initialSchema];

    for (const migration of migrations) {
        if (applied.get(migration.version)) {
            console.log(
                `[ExGudang] Migration ${migration.version} already applied`
            );
            continue;
        }

        // [MODIFIED] Use explicit SQLite transaction
        try {
            db.exec('BEGIN IMMEDIATE');

            migration.up(db);
            recordMigration.run(migration.version);

            db.exec('COMMIT');

            console.log(
                `[ExGudang] Migration ${migration.version} applied successfully`
            );
        } catch (error) {
            // [ADDED] Roll back partial migration on failure
            try {
                db.exec('ROLLBACK');
            } catch {
                // Preserve the original migration error
            }

            throw error;
        }
    }
}

try {
    runMigrations();
} catch (error) {
    console.error('[ExGudang] Migration failed:', error.message);
    process.exitCode = 1;
} finally {
    db.close();
}
