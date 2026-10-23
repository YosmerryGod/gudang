
'use strict';

// [ADDED] Authentication service for ExGudang
const bcrypt = require('bcryptjs');
const { db } = require('../../config/database');

// [ADDED] Get required environment configuration
function getAdminConfig() {
    const username = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error(
            'ADMIN_USERNAME and ADMIN_PASSWORD must be configured in .env'
        );
    }

    if (password.length < 12) {
        throw new Error(
            'ADMIN_PASSWORD must contain at least 12 characters'
        );
    }

    return { username, password };
}

// [ADDED] Create the initial admin account if it does not exist
async function initializeAdmin() {
    const { username, password } = getAdminConfig();

    const findAdmin = db.prepare(`
        SELECT id, username
        FROM admins
        WHERE username = ?
    `);

    const existingAdmin = findAdmin.get(username);

    if (existingAdmin) {
        return {
            created: false,
            id: existingAdmin.id,
            username: existingAdmin.username
        };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertAdmin = db.prepare(`
        INSERT INTO admins (username, password_hash)
        VALUES (?, ?)
    `);

    try {
        const result = insertAdmin.run(username, passwordHash);

        return {
            created: true,
            id: Number(result.lastInsertRowid),
            username
        };
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const admin = findAdmin.get(username);

            if (admin) {
                return {
                    created: false,
                    id: admin.id,
                    username: admin.username
                };
            }
        }

        throw error;
    }
}

// [ADDED] Verify administrator credentials
async function verifyCredentials(username, password) {
    if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        !username.trim() ||
        !password
    ) {
        return null;
    }

    const admin = db.prepare(`
        SELECT id, username, password_hash
        FROM admins
        WHERE username = ?
    `).get(username.trim());

    if (!admin) {
        return null;
    }

    const validPassword = await bcrypt.compare(
        password,
        admin.password_hash
    );

    if (!validPassword) {
        return null;
    }

    return {
        id: admin.id,
        username: admin.username
    };
}

// [ADDED] Find administrator by ID
function getAdminById(id) {
    return db.prepare(`
        SELECT id, username, created_at
        FROM admins
        WHERE id = ?
    `).get(id) || null;
}

// [ADDED] Export authentication service functions
module.exports = {
    initializeAdmin,
    verifyCredentials,
    getAdminById
};
