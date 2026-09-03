import { createServer, type Server } from 'node:http';
import process from 'node:process';
import app from './app.ts';
import { envConfig } from './config/index.ts';
import { connectRedis, disconnectRedis } from './libs/redis.ts';
import { connectDatabase } from './prisma/db.ts';

let server: Server | null = null;

const bootstrap = async () => {
	try {
		console.log(
			`[Bootstrap] Starting DwellOS API in ${envConfig.nodeEnv} mode...`,
		);

		// Connect to PostgreSQL database
		if (envConfig.databaseUrl) {
			try {
				await connectDatabase();
				console.log('[PostgreSQL] Connected to database successfully.');
			} catch (dbError) {
				console.error('[PostgreSQL] Database connection error:', dbError);
			}
		} else {
			console.warn(
				'[PostgreSQL] DATABASE_URL is not set. Database queries will fail.',
			);
		}

		// Connect to Redis
		await connectRedis();

		// Start HTTP Server
		server = createServer(app);
		server.listen(envConfig.port, '0.0.0.0', () => {
			console.log(
				`🚀 Server running at http://localhost:${envConfig.port} (env: ${envConfig.nodeEnv})`,
			);
		});
	} catch (error) {
		console.error('[Bootstrap] Fatal error during startup:', error);
		process.exit(1);
	}
};

const handleGracefulShutdown = async (signal: string) => {
	console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

	if (server) {
		server.close(async () => {
			console.log('[Server] HTTP server closed.');
			try {
				await disconnectRedis();
			} catch (err) {
				console.error('[Server] Error disconnecting Redis:', err);
			}
			console.log('[Server] Graceful shutdown complete. Exiting.');
			process.exit(0);
		});

		// Force exit after 10s timeout
		setTimeout(() => {
			console.error('[Server] Forced shutdown due to timeout.');
			process.exit(1);
		}, 10000).unref();
	} else {
		process.exit(0);
	}
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
	console.error('[UnhandledRejection]:', reason);
});

process.on('uncaughtException', (error) => {
	console.error('[UncaughtException]:', error);
	process.exit(1);
});

bootstrap();
