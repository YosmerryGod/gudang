
'use strict';

// [ADDED] Load environment variables before application initialization
require('dotenv').config();

// [ADDED] Import application and database
const { buildApp, initializeApplication } = require('./app');
const { db } = require('./config/database');

// [ADDED] Start ExGudang server
async function startServer() {
    let app;

    try {
        // [ADDED] Initialize administrator account
        await initializeApplication();

        // [ADDED] Build Fastify application
        app = buildApp();

        // [ADDED] Keep the server local during development
        const host = process.env.HOST || '127.0.0.1';
        const port = Number(process.env.PORT || 3000);

        if (host !== '127.0.0.1' && host !== 'localhost') {
            throw new Error(
                'Development server must bind to localhost only'
            );
        }

        // [ADDED] Start listening
        await app.listen({
            host,
            port
        });

        app.log.info(`ExGudang API listening at http://${host}:${port}`);
    } catch (error) {
        console.error('[ExGudang] Failed to start server:', error.message);

        if (app) {
            try {
                await app.close();
            } catch {
                // Preserve the original startup error
            }
        }

        if (db.isOpen) {
            db.close();
        }

        process.exitCode = 1;
    }

    // [ADDED] Graceful shutdown handler
    if (app && app.server.listening) {
        const shutdown = async (signal) => {
            app.log.info(`Received ${signal}; shutting down`);

            try {
                await app.close();

                if (db.isOpen) {
                    db.close();
                }

                process.exitCode = 0;
            } catch (error) {
                console.error(
                    '[ExGudang] Shutdown failed:',
                    error.message
                );

                process.exitCode = 1;
            }
        };

        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGTERM', () => shutdown('SIGTERM'));
    }
}

// [ADDED] Execute server startup
startServer();
