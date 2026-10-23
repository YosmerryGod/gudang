
'use strict';

// [MODIFIED] Load environment configuration
require('dotenv').config();

// [MODIFIED] Use SQLite built into Node.js
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

// [ADDED] Resolve project root and database path
const projectRoot = path.resolve(__dirname, '../..');

const configuredDatabasePath =
    process.env.DATABASE_PATH || './storage/exgudang.db';

const databasePath = path.isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : path.resolve(projectRoot, configuredDatabasePath);

// [ADDED] Ensure the database directory exists
fs.mkdirSync(path.dirname(databasePath), {
    recursive: true
});

// [MODIFIED] Open SQLite database using Node.js built-in module
let db;

try {
    db = new DatabaseSync(databasePath);

    // [ADDED] Enable foreign key constraints
    db.exec('PRAGMA foreign_keys = ON');

    // [ADDED] Enable write-ahead logging
    db.exec('PRAGMA journal_mode = WAL');

    // [ADDED] Configure synchronization
    db.exec('PRAGMA synchronous = NORMAL');

    // [ADDED] Wait up to five seconds when database is busy
    db.exec('PRAGMA busy_timeout = 5000');

    // [ADDED] Verify database connection
    db.prepare('SELECT 1').get();
} catch (error) {
    // [ADDED] Close database if initialization fails
    if (db) {
        try {
            db.close();
        } catch {
            // Preserve the original initialization error
        }
    }

    console.error(
        '[ExGudang] Failed to initialize SQLite database:',
        error.message
    );

    throw error;
}

// [MODIFIED] Export database connection and resolved path
module.exports = {
    db,
    databasePath
};
